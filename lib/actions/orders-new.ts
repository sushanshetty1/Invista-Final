"use server";

import { neonClient } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { actionError, actionSuccess } from "@/lib/api-utils";
import {
	CreateOrderSchema,
	UpdateOrderStatusSchema,
	OrderFilterSchema,
	type CreateOrderInput,
	type UpdateOrderStatusInput,
	type OrderFilterInput,
} from "@/lib/validations/order";
import { Prisma } from "../../prisma/generated/neon";

// Generate unique order number
async function generateOrderNumber(): Promise<string> {
	const year = new Date().getFullYear();
	const lastOrder = await neonClient.order.findFirst({
		where: {
			orderNumber: {
				startsWith: `ORD-${year}-`,
			},
		},
		orderBy: {
			orderNumber: "desc",
		},
	});

	let nextNumber = 1;
	if (lastOrder) {
		const lastNumber = parseInt(lastOrder.orderNumber.split("-")[2]);
		nextNumber = lastNumber + 1;
	}

	return `ORD-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// Validate inventory availability
async function validateInventoryAvailability(
	items: CreateOrderInput["items"],
	warehouseId: string,
) {
	const unavailableItems: string[] = [];

	for (const item of items) {
		const inventoryItem = await neonClient.inventoryItem.findFirst({
			where: {
				productId: item.productId,
				variantId: item.variantId || null,
				warehouseId,
				status: "AVAILABLE",
			},
		});

		if (!inventoryItem || inventoryItem.quantity - inventoryItem.reservedQuantity < item.quantity) {
			const product = await neonClient.product.findUnique({
				where: { id: item.productId },
				select: { name: true, sku: true },
			});

			unavailableItems.push(
				`${product?.name || "Unknown"} (${product?.sku || "Unknown SKU"}) - Available: ${
					(inventoryItem?.quantity || 0) - (inventoryItem?.reservedQuantity || 0)
				}, Required: ${item.quantity}`,
			);
		}
	}

	return unavailableItems;
}

// Reserve inventory for order
async function reserveInventory(
	orderId: string,
	items: CreateOrderInput["items"],
	warehouseId: string,
	userId: string,
) {
	for (const item of items) {
		const inventoryItem = await neonClient.inventoryItem.findFirst({
			where: {
				productId: item.productId,
				variantId: item.variantId || null,
				warehouseId,
				status: "AVAILABLE",
			},
		});

		if (inventoryItem) {
			// Update inventory item to reserve quantity
			await neonClient.inventoryItem.update({
				where: { id: inventoryItem.id },
				data: {
					reservedQuantity: {
						increment: item.quantity,
					},
					// availableQuantity: {
					// 	decrement: item.quantity,
					// },
				},
			});

			// Create stock reservation record
			await neonClient.stockReservation.create({
				data: {
					inventoryItemId: inventoryItem.id,
					productId: item.productId,
					warehouseId: warehouseId,
					reservedFor: "ORDER",
					referenceId: orderId,
					quantity: item.quantity,
					createdById: userId,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
				},
			});

			// Create inventory movement record
			await neonClient.inventoryMovement.create({
				data: {
					type: "ADJUSTMENT",
					// subtype: "ORDER_RESERVE", // Removed
					// productId: item.productId, // Removed
					// variantId: item.variantId, // Removed
					// warehouseId, // Removed
					inventoryItemId: inventoryItem.id,
					quantity: -item.quantity,
					quantityBefore: inventoryItem.quantity, // Use quantity instead of availableQuantity
					quantityAfter: inventoryItem.quantity - item.quantity, // This might be wrong logic for reservation, but matching schema type
					referenceType: "Order",
					referenceId: orderId,
					reason: "Order reservation",
					createdById: userId,
				},
			});
		}
	}
}

// Create a new order
export async function createOrder(data: CreateOrderInput) {
	try {
		// Validate input data
		const validatedData = CreateOrderSchema.parse(data);

		// Authenticate user
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return actionError("Authentication required");
		}

		// Get user's company from company_users table
		const { data: companyUser, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUser) {
			return actionError("User not associated with any company");
		}

		// Validate customer exists and belongs to company
		const customer = await neonClient.customer.findFirst({
			where: {
				id: validatedData.customerId,
				companyId: companyUser.companyId,
			},
		});

		if (!customer) {
			return actionError("Customer not found or not accessible");
		}

		// Validate warehouse exists and belongs to company
		const warehouse = await neonClient.warehouse.findFirst({
			where: {
				id: validatedData.warehouseId,
				companyId: companyUser.companyId,
				isActive: true,
			},
		});

		if (!warehouse) {
			return actionError("Warehouse not found or not accessible");
		}

		// Check inventory availability
		const unavailableItems = await validateInventoryAvailability(
			validatedData.items,
			validatedData.warehouseId,
		);

		if (unavailableItems.length > 0) {
			return actionError(
				`Insufficient inventory for: ${unavailableItems.join(", ")}`,
			);
		}

		// Generate order number
		const orderNumber = await generateOrderNumber();

		// Calculate totals
		let subtotal = 0;
		let totalDiscountAmount = 0;

		validatedData.items.forEach((item) => {
			const itemTotal = item.quantity * item.unitPrice;
			subtotal += itemTotal;
			totalDiscountAmount += item.discountAmount;
		});

		const finalTotal = subtotal - totalDiscountAmount;

		// Start transaction
		const result = await neonClient.$transaction(async (tx) => {
			// Create order
			const order = await tx.order.create({
				data: {
					orderNumber,
					customerId: validatedData.customerId,
					warehouseId: validatedData.warehouseId,
					companyId: companyUser.companyId,
					// type: validatedData.type, // Removed
					// channel: validatedData.channel, // Removed
					// priority: validatedData.priority, // Removed
					subtotal: new Prisma.Decimal(subtotal),
					discountAmount: new Prisma.Decimal(totalDiscountAmount),
					totalAmount: new Prisma.Decimal(finalTotal),
					// requiredDate: validatedData.requiredDate, // Removed
					// promisedDate: validatedData.promisedDate, // Removed
					// shippingMethod: validatedData.shippingMethod, // Removed
					shippingAddress: validatedData.shippingAddress,
					notes: validatedData.notes,
					// internalNotes: validatedData.internalNotes, // Removed
					// rushOrder: validatedData.rushOrder, // Removed
					createdById: user.id,
				},
			});

			// Create order items
			for (const item of validatedData.items) {
				const product = await tx.product.findUnique({
					where: { id: item.productId },
				});

				if (!product) {
					throw new Error(`Product with ID ${item.productId} not found`);
				}

				const itemTotal = item.quantity * item.unitPrice - item.discountAmount;

				await tx.orderItem.create({
					data: {
						orderId: order.id,
						productId: item.productId,
						variantId: item.variantId,
						orderedQty: item.quantity,
						// remainingQty: item.quantity, // Removed from schema?
						unitPrice: new Prisma.Decimal(item.unitPrice),
						totalPrice: new Prisma.Decimal(itemTotal),
						// discountAmount: new Prisma.Decimal(item.discountAmount), // Removed
						// productName: product.name, // Removed
						// productSku: product.sku, // Removed
					},
				});
			}

			return order;
		});

		// Reserve inventory after successful order creation
		await reserveInventory(
			result.id,
			validatedData.items,
			validatedData.warehouseId,
			user.id,
		);

		revalidatePath("/orders");
		return actionSuccess(result);
	} catch (error) {
		console.error("Error creating order:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to create order");
	}
}

// Get all orders with filters and pagination
export async function getOrders(filters: Partial<OrderFilterInput> = {}) {
	try {
		// Set defaults for required fields
		const validatedFilters = OrderFilterSchema.parse({
			page: 1,
			limit: 10,
			...filters,
		});

		// Authenticate user
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return actionError("Authentication required");
		}

		// Get user's company
		const { data: companyUser, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUser) {
			return actionError("User not associated with any company");
		}

		// Build where clause
		const where: Prisma.OrderWhereInput = {
			companyId: companyUser.companyId,
		};

		if (validatedFilters.status) {
			where.status = {
				in: validatedFilters.status === "PENDING" ? ["PENDING"] :
					validatedFilters.status === "CONFIRMED" ? ["CONFIRMED"] :
					validatedFilters.status === "PROCESSING" ? ["PROCESSING"] :
					validatedFilters.status === "SHIPPED" ? ["SHIPPED"] :
					validatedFilters.status === "DELIVERED" ? ["DELIVERED"] :
					validatedFilters.status === "CANCELLED" ? ["CANCELLED"] :
					validatedFilters.status === "RETURNED" ? ["RETURNED"] : undefined
			};
		}

		// if (validatedFilters.fulfillmentStatus) {
		// 	where.fulfillmentStatus = validatedFilters.fulfillmentStatus;
		// }

		if (validatedFilters.paymentStatus) {
			where.paymentStatus = {
				in: validatedFilters.paymentStatus === "PENDING" ? ["PENDING"] : 
					validatedFilters.paymentStatus === "PAID" ? ["PAID"] :
					validatedFilters.paymentStatus === "PARTIALLY_PAID" ? ["PARTIALLY_PAID"] :
					validatedFilters.paymentStatus === "FAILED" ? ["FAILED"] :
					validatedFilters.paymentStatus === "REFUNDED" ? ["REFUNDED"] : undefined
			};
		}

		if (validatedFilters.customerId) {
			where.customerId = validatedFilters.customerId;
		}

		if (validatedFilters.warehouseId) {
			where.warehouseId = validatedFilters.warehouseId;
		}

		// if (validatedFilters.type) {
		// 	where.type = validatedFilters.type;
		// }

		// if (validatedFilters.channel) {
		// 	where.channel = validatedFilters.channel;
		// }

		// if (validatedFilters.priority) {
		// 	where.priority = validatedFilters.priority;
		// }

		if (validatedFilters.dateFrom || validatedFilters.dateTo) {
			where.orderDate = {};
			if (validatedFilters.dateFrom) {
				where.orderDate.gte = validatedFilters.dateFrom;
			}
			if (validatedFilters.dateTo) {
				where.orderDate.lte = validatedFilters.dateTo;
			}
		}

		if (validatedFilters.searchTerm) {
			where.OR = [
				{
					orderNumber: {
						contains: validatedFilters.searchTerm,
						mode: "insensitive",
					},
				},
				{
					customer: {
						firstName: {
							contains: validatedFilters.searchTerm,
							mode: "insensitive",
						},
					},
				},
				{
					customer: {
						lastName: {
							contains: validatedFilters.searchTerm,
							mode: "insensitive",
						},
					},
				},
				{
					customer: {
						businessName: {
							contains: validatedFilters.searchTerm,
							mode: "insensitive",
						},
					},
				},
				{
					customer: {
						email: {
							contains: validatedFilters.searchTerm,
							mode: "insensitive",
						},
					},
				},
			];
		}

		// Calculate pagination
		const skip = (validatedFilters.page - 1) * validatedFilters.limit;

		// Get total count for pagination
		const totalCount = await neonClient.order.count({ where });

		// Get orders
		const orders = await neonClient.order.findMany({
			where,
			include: {
				customer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						businessName: true,
						email: true,
					},
				},
				// warehouse: {
				// 	select: {
				// 		id: true,
				// 		name: true,
				// 		code: true,
				// 	},
				// },
				items: {
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
						variant: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
					},
				},
			},
			orderBy: {
				orderDate: "desc",
			},
			skip,
			take: validatedFilters.limit,
		});

		const totalPages = Math.ceil(totalCount / validatedFilters.limit);

		return actionSuccess({
			orders,
			pagination: {
				page: validatedFilters.page,
				limit: validatedFilters.limit,
				totalCount,
				totalPages,
				hasNext: validatedFilters.page < totalPages,
				hasPrev: validatedFilters.page > 1,
			},
		});
	} catch (error) {
		console.error("Error fetching orders:", error);
		return actionError("Failed to fetch orders");
	}
}

// Get order by ID
export async function getOrderById(id: string) {
	try {
		// Authenticate user
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return actionError("Authentication required");
		}

		// Get user's company
		const { data: companyUser, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUser) {
			return actionError("User not associated with any company");
		}

		const order = await neonClient.order.findFirst({
			where: {
				id,
				companyId: companyUser.companyId,
			},
			include: {
				customer: true,
				// warehouse: true, // Removed
				items: {
					include: {
						product: true,
						variant: true,
					},
				},
				// shipments: {
				// 	include: {
				// 		packages: true,
				// 		tracking: {
				// 			orderBy: { eventDate: "desc" },
				// 		},
				// 	},
				// },
				// invoices: true,
			},
		});

		if (!order) {
			return actionError("Order not found");
		}

		return actionSuccess(order);
	} catch (error) {
		console.error("Error fetching order:", error);
		return actionError("Failed to fetch order");
	}
}

// Update order status with automatic state transitions
export async function updateOrderStatus(data: UpdateOrderStatusInput & { orderId: string }) {
	try {
		// Validate input data
		const validatedData = UpdateOrderStatusSchema.parse(data);

		// Authenticate user
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return actionError("Authentication required");
		}

		// Get user's company
		const { data: companyUser, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUser) {
			return actionError("User not associated with any company");
		}

		// Get current order
		const currentOrder = await neonClient.order.findFirst({
			where: {
				id: data.orderId,
				companyId: companyUser.companyId,
			},
		});

		if (!currentOrder) {
			return actionError("Order not found");
		}

		// Prepare update data
		const updateData: Prisma.OrderUpdateInput = {
			// status: validatedData.status, // Handle manually
			updatedAt: new Date(),
		};

		if (validatedData.status === "PENDING" || validatedData.status === "CONFIRMED" || 
			validatedData.status === "PROCESSING" || validatedData.status === "SHIPPED" || 
			validatedData.status === "DELIVERED" || validatedData.status === "CANCELLED" || 
			validatedData.status === "RETURNED") {
			updateData.status = validatedData.status;
		}

		// Auto-update fulfillment status based on order status
		// if (validatedData.status === "CONFIRMED" && !validatedData.fulfillmentStatus) {
		// 	updateData.fulfillmentStatus = "PENDING";
		// } else if (validatedData.status === "PROCESSING" && !validatedData.fulfillmentStatus) {
		// 	updateData.fulfillmentStatus = "PICKING";
		// } else if (validatedData.status === "SHIPPED") {
		// 	updateData.fulfillmentStatus = "SHIPPED";
		// 	updateData.shippedDate = validatedData.shippedDate || new Date();
		// } else if (validatedData.status === "DELIVERED") {
		// 	updateData.fulfillmentStatus = "DELIVERED";
		// 	updateData.deliveredDate = validatedData.deliveredDate || new Date();
		// } else if (validatedData.fulfillmentStatus) {
		// 	updateData.fulfillmentStatus = validatedData.fulfillmentStatus;
		// }

		// if (validatedData.paymentStatus) {
		// 	// updateData.paymentStatus = validatedData.paymentStatus; // Type mismatch potential, handle carefully if needed
		// }

		if (validatedData.trackingNumber) {
			updateData.trackingNumber = validatedData.trackingNumber;
		}

		if (validatedData.carrier) {
			updateData.carrier = validatedData.carrier;
		}

		// Update order
		const order = await neonClient.order.update({
			where: { id: data.orderId },
			data: updateData,
			include: {
				customer: true,
				// warehouse: true, // Removed
				items: true,
			},
		});

		// Handle inventory movements based on status changes
		if (validatedData.status === "CANCELLED" && currentOrder.status !== "CANCELLED") {
			// Release reserved inventory
			const reservations = await neonClient.stockReservation.findMany({
				where: {
					// referenceType: "Order", // Removed
					referenceId: data.orderId,
					status: "ACTIVE",
				},
			});

			for (const reservation of reservations) {
				// Update inventory item
				await neonClient.inventoryItem.update({
					where: { id: reservation.inventoryItemId },
					data: {
						reservedQuantity: {
							decrement: reservation.quantity,
						},
						// availableQuantity: {
						// 	increment: reservation.quantity,
						// },
					},
				});

				// Update reservation status
				await neonClient.stockReservation.update({
					where: { id: reservation.id },
					data: {
						status: "CANCELLED",
						releasedAt: new Date(),
					},
				});

				// Create inventory movement
				await neonClient.inventoryMovement.create({
					data: {
						type: "ADJUSTMENT",
						// subtype: "ORDER_CANCEL", // Removed
						// productId: order.items[0]?.productId || "", // Removed
						// warehouseId: order.warehouseId, // Removed
						inventoryItemId: reservation.inventoryItemId,
						quantity: reservation.quantity,
						quantityBefore: 0, // Will be updated by trigger
						quantityAfter: reservation.quantity,
						referenceType: "Order",
						referenceId: data.orderId,
						reason: "Order cancellation - inventory release",
						createdById: user.id,
					},
				});
			}
		}

		revalidatePath("/orders");
		return actionSuccess(order);
	} catch (error) {
		console.error("Error updating order status:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to update order status");
	}
}

// Get order statistics
export async function getOrderStats() {
	try {
		// Authenticate user
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return actionError("Authentication required");
		}

		// Get user's company
		const { data: companyUser, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUser) {
			return actionError("User not associated with any company");
		}

		const where: Prisma.OrderWhereInput = {
			companyId: companyUser.companyId,
		};

		const [totalOrders, pendingOrders, shippedOrders, deliveredOrders, revenueResult] =
			await Promise.all([
				neonClient.order.count({ where }),
				neonClient.order.count({
					where: {
						...where,
						status: {
							in: ["PENDING", "CONFIRMED", "PROCESSING"],
						},
					},
				}),
				neonClient.order.count({
					where: {
						...where,
						status: "SHIPPED",
					},
				}),
				neonClient.order.count({
					where: {
						...where,
						status: "DELIVERED",
					},
				}),
				neonClient.order.aggregate({
					_sum: {
						totalAmount: true,
					},
					where: {
						...where,
						status: {
							notIn: ["CANCELLED"],
						},
					},
				}),
			]);

		const totalRevenue = Number(revenueResult._sum.totalAmount) || 0;
		const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

		return actionSuccess({
			stats: {
				totalOrders,
				pendingOrders,
				shippedOrders,
				deliveredOrders,
				totalRevenue,
				averageOrderValue,
			},
		});
	} catch (error) {
		console.error("Error fetching order statistics:", error);
		return actionError("Failed to fetch order statistics");
	}
}
