"use server";

import { neonClient } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

type ActionContext = {
	userId?: string;
	companyId?: string;
};

type ResolvedActionContext = {
	userId: string;
	companyId: string;
};

async function resolveActionContext(
	context: ActionContext = {},
): Promise<ResolvedActionContext | { error: string }> {
	let userId = context.userId;

	if (!userId) {
		try {
			const supabase = await createClient();
			const {
				data: { user },
				error: sessionError,
			} = await supabase.auth.getUser();

			if (sessionError || !user?.id) {
				return { error: "Authentication required" };
			}

			userId = user.id;
		} catch (error) {
			console.error("[resolveActionContext] Exception during auth:", error);
			return { error: "Authentication required" };
		}
	}

	let companyId = context.companyId;

	if (!companyId) {
		try {
			// Create a temporary Supabase client to query with user's auth
			const supabase = await createClient();
			
			// First try to get company from company_users using user's session
			const { data: companyUser, error: companyError } = await supabase
				.from("company_users")
				.select("companyId")
				.eq("userId", userId)
				.eq("isActive", true)
				.single();

			if (companyUser) {
				companyId = companyUser.companyId;
			} else {
				// If not found in company_users, check if user owns a company
				const { data: ownedCompany, error: ownedError } = await supabase
					.from("companies")
					.select("id")
					.eq("createdBy", userId)
					.eq("isActive", true)
					.single();

				if (ownedCompany) {
					companyId = ownedCompany.id;
				} else {
					console.error("[resolveActionContext] No company found:", {
						userId,
						companyUserError: companyError?.message,
						ownedCompanyError: ownedError?.message,
					});
					return { error: "User not associated with any company" };
				}
			}
		} catch (error) {
			console.error("[resolveActionContext] Exception during company lookup:", error);
			return { error: "User not associated with any company" };
		}
	}

	if (!companyId) {
		return { error: "User not associated with any company" };
	}

	return { userId, companyId };
}

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

		if (!inventoryItem || inventoryItem.availableQuantity < item.quantity) {
			const product = await neonClient.product.findUnique({
				where: { id: item.productId },
				select: { name: true, sku: true },
			});

			unavailableItems.push(
				`${product?.name || "Unknown"} (${product?.sku || "Unknown SKU"}) - Available: ${
					inventoryItem?.availableQuantity || 0
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
					availableQuantity: {
						decrement: item.quantity,
					},
				},
			});

			// Create stock reservation record
			await neonClient.stockReservation.create({
				data: {
					inventoryItemId: inventoryItem.id,
					reservationType: "ORDER",
					referenceType: "Order",
					referenceId: orderId,
					quantity: item.quantity,
					reservedBy: userId,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
				},
			});

			// Create inventory movement record
			await neonClient.inventoryMovement.create({
				data: {
					type: "ADJUSTMENT",
					subtype: "ORDER_RESERVE",
					productId: item.productId,
					variantId: item.variantId,
					warehouseId,
					inventoryItemId: inventoryItem.id,
					quantity: -item.quantity,
					quantityBefore: inventoryItem.availableQuantity,
					quantityAfter: inventoryItem.availableQuantity - item.quantity,
					referenceType: "Order",
					referenceId: orderId,
					reason: "Order reservation",
					userId,
				},
			});
		}
	}
}

// Create a new order
export async function createOrder(
	data: CreateOrderInput,
	context?: ActionContext,
) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { userId, companyId } = resolvedContext;

		// Validate input data
		const validatedData = CreateOrderSchema.parse(data);

		// Validate customer exists and belongs to company
		const customer = await neonClient.customer.findFirst({
			where: {
				id: validatedData.customerId,
				companyId,
			},
		});

		if (!customer) {
			return actionError("Customer not found or not accessible");
		}

		// Validate warehouse exists and belongs to company (warehouses are in Supabase company_locations)
		const supabase = await createClient();
		const { data: warehouse, error: warehouseError } = await supabase
			.from("company_locations")
			.select("id, name, isActive")
			.eq("id", validatedData.warehouseId)
			.eq("companyId", companyId)
			.eq("isActive", true)
			.single();

		if (warehouseError || !warehouse) {
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
					companyId,
					type: validatedData.type,
					channel: validatedData.channel,
					priority: validatedData.priority,
					subtotal: new Prisma.Decimal(subtotal),
					discountAmount: new Prisma.Decimal(totalDiscountAmount),
					totalAmount: new Prisma.Decimal(finalTotal),
					requiredDate: validatedData.requiredDate,
					promisedDate: validatedData.promisedDate,
					shippingMethod: validatedData.shippingMethod,
					shippingAddress: validatedData.shippingAddress,
					notes: validatedData.notes,
					internalNotes: validatedData.internalNotes,
					rushOrder: validatedData.rushOrder,
					createdBy: userId,
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
						remainingQty: item.quantity,
						unitPrice: new Prisma.Decimal(item.unitPrice),
						totalPrice: new Prisma.Decimal(itemTotal),
						discountAmount: new Prisma.Decimal(item.discountAmount),
						productName: product.name,
						productSku: product.sku,
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
			userId,
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
export async function getOrders(
	filters: Partial<OrderFilterInput> = {},
	context?: ActionContext,
) {
	try {
		// Set defaults for required fields
		const validatedFilters = OrderFilterSchema.parse({
			page: 1,
			limit: 10,
			...filters,
		});

		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		// Build where clause
		const where: Prisma.OrderWhereInput = {
			companyId,
		};

		if (validatedFilters.status) {
			where.status = validatedFilters.status;
		}

		if (validatedFilters.fulfillmentStatus) {
			where.fulfillmentStatus = validatedFilters.fulfillmentStatus;
		}

		if (validatedFilters.paymentStatus) {
			where.paymentStatus = validatedFilters.paymentStatus;
		}

		if (validatedFilters.customerId) {
			where.customerId = validatedFilters.customerId;
		}

		if (validatedFilters.warehouseId) {
			where.warehouseId = validatedFilters.warehouseId;
		}

		if (validatedFilters.type) {
			where.type = validatedFilters.type;
		}

		if (validatedFilters.channel) {
			where.channel = validatedFilters.channel;
		}

		if (validatedFilters.priority) {
			where.priority = validatedFilters.priority;
		}

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
						companyName: {
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
						companyName: true,
						email: true,
					},
				},
				warehouse: {
					select: {
						id: true,
						name: true,
						code: true,
					},
				},
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
export async function getOrderById(id: string, context?: ActionContext) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const order = await neonClient.order.findFirst({
			where: {
				id,
				companyId,
			},
			include: {
				customer: true,
				warehouse: true,
				items: {
					include: {
						product: true,
						variant: true,
					},
				},
				shipments: {
					include: {
						packages: true,
						tracking: {
							orderBy: { eventDate: "desc" },
						},
					},
				},
				invoices: true,
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
export async function updateOrderStatus(
	data: UpdateOrderStatusInput & { orderId: string },
	context?: ActionContext,
) {
	try {
		// Validate input data
		const validatedData = UpdateOrderStatusSchema.parse(data);

		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { userId, companyId } = resolvedContext;

		// Get current order
		const currentOrder = await neonClient.order.findFirst({
			where: {
				id: data.orderId,
				companyId,
			},
		});

		if (!currentOrder) {
			return actionError("Order not found");
		}

		// Prepare update data
		const updateData: Prisma.OrderUpdateInput = {
			status: validatedData.status,
			updatedAt: new Date(),
		};

		// Auto-update fulfillment status based on order status
		if (validatedData.status === "CONFIRMED" && !validatedData.fulfillmentStatus) {
			updateData.fulfillmentStatus = "PENDING";
		} else if (validatedData.status === "PROCESSING" && !validatedData.fulfillmentStatus) {
			updateData.fulfillmentStatus = "PICKING";
		} else if (validatedData.status === "SHIPPED") {
			updateData.fulfillmentStatus = "SHIPPED";
			updateData.shippedDate = validatedData.shippedDate || new Date();
		} else if (validatedData.status === "DELIVERED") {
			updateData.fulfillmentStatus = "DELIVERED";
			updateData.deliveredDate = validatedData.deliveredDate || new Date();
		} else if (validatedData.fulfillmentStatus) {
			updateData.fulfillmentStatus = validatedData.fulfillmentStatus;
		}

		if (validatedData.paymentStatus) {
			updateData.paymentStatus = validatedData.paymentStatus;
		}

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
				warehouse: true,
				items: true,
			},
		});

		// Handle inventory movements based on status changes
		if (validatedData.status === "CANCELLED" && currentOrder.status !== "CANCELLED") {
			// Release reserved inventory
			const reservations = await neonClient.stockReservation.findMany({
				where: {
					referenceType: "Order",
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
						availableQuantity: {
							increment: reservation.quantity,
						},
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
						subtype: "ORDER_CANCEL",
						productId: order.items[0]?.productId || "",
						warehouseId: order.warehouseId,
						inventoryItemId: reservation.inventoryItemId,
						quantity: reservation.quantity,
						quantityBefore: 0, // Will be updated by trigger
						quantityAfter: reservation.quantity,
						referenceType: "Order",
						referenceId: data.orderId,
						reason: "Order cancellation - inventory release",
						userId,
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
export async function getOrderStats(context?: ActionContext) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const where: Prisma.OrderWhereInput = {
			companyId,
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

export async function getOrderAnalytics(context?: ActionContext) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const baseWhere: Prisma.OrderWhereInput = {
			companyId,
		};

		const now = new Date();
		const trendStart = new Date(now);
		trendStart.setDate(trendStart.getDate() - 30);

		const [
			totalOrders,
			pendingOrders,
			shippedOrders,
			deliveredOrdersCount,
			revenueAggregate,
			recentOrders,
			topCustomersRaw,
			upcomingOrders,
			orderItemAggregate,
			pendingPaymentCount,
			deliveredOrdersForTiming,
			awaitingShipmentCount,
		] = await Promise.all([
			neonClient.order.count({ where: baseWhere }),
			neonClient.order.count({
				where: {
					...baseWhere,
					status: {
						in: ["PENDING", "CONFIRMED", "PROCESSING"],
					},
				},
			}),
			neonClient.order.count({
				where: {
					...baseWhere,
					status: "SHIPPED",
				},
			}),
			neonClient.order.count({
				where: {
					...baseWhere,
					status: "DELIVERED",
				},
			}),
			neonClient.order.aggregate({
				_sum: {
					totalAmount: true,
				},
				where: {
					...baseWhere,
					status: {
						notIn: ["CANCELLED"],
					},
				},
			}),
			neonClient.order.findMany({
				where: {
					...baseWhere,
					orderDate: {
						gte: trendStart,
					},
					status: {
						notIn: ["CANCELLED"],
					},
				},
				select: {
					orderDate: true,
					totalAmount: true,
				},
				orderBy: {
					orderDate: "asc",
				},
			}),
			neonClient.order.groupBy({
				by: ["customerId"],
				where: {
					...baseWhere,
					status: {
						notIn: ["CANCELLED"],
					},
				},
				_sum: {
					totalAmount: true,
				},
				_count: {
					_all: true,
				},
				_max: {
					orderDate: true,
				},
				orderBy: {
					_sum: {
						totalAmount: "desc",
					},
				},
				take: 5,
			}),
			neonClient.order.findMany({
				where: {
					...baseWhere,
					status: {
						in: ["CONFIRMED", "PROCESSING", "SHIPPED"],
					},
				},
				select: {
					id: true,
					orderNumber: true,
					orderDate: true,
					requiredDate: true,
					promisedDate: true,
					priority: true,
					fulfillmentStatus: true,
					customer: {
						select: {
							companyName: true,
							firstName: true,
							lastName: true,
						},
					},
					items: {
						select: {
							orderedQty: true,
							remainingQty: true,
						},
					},
				},
				orderBy: [
					{ requiredDate: "asc" },
					{ promisedDate: "asc" },
					{ orderDate: "asc" },
				],
				take: 10,
			}),
			neonClient.orderItem.aggregate({
				_sum: {
					orderedQty: true,
					remainingQty: true,
					shippedQty: true,
				},
				where: {
					order: {
						companyId,
					},
				},
			}),
			neonClient.order.count({
				where: {
					...baseWhere,
					paymentStatus: {
						in: ["PENDING", "PROCESSING", "PARTIALLY_PAID", "FAILED"],
					},
				},
			}),
			neonClient.order.findMany({
				where: {
					...baseWhere,
					deliveredDate: {
						not: null,
					},
				},
				select: {
					deliveredDate: true,
					promisedDate: true,
					requiredDate: true,
					shippedDate: true,
				},
			}),
			neonClient.order.count({
				where: {
					...baseWhere,
					status: {
						in: ["CONFIRMED", "PROCESSING"],
					},
				},
			}),
		]);

		const totalRevenue = Number(revenueAggregate._sum.totalAmount ?? 0);
		const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
		const fulfillmentEfficiency =
			totalOrders > 0 ? (deliveredOrdersCount + shippedOrders) / totalOrders : 0;

		const revenueTrendMap = new Map<string, { revenue: number; orders: number }>();
		recentOrders.forEach((order) => {
			const dateKey = order.orderDate.toISOString().slice(0, 10);
			const current = revenueTrendMap.get(dateKey) || { revenue: 0, orders: 0 };
			current.revenue += Number(order.totalAmount ?? 0);
			current.orders += 1;
			revenueTrendMap.set(dateKey, current);
		});

		const revenueTrend = Array.from(revenueTrendMap.entries())
			.sort(([a], [b]) => (a > b ? 1 : -1))
			.map(([date, values]) => ({
				date,
				revenue: values.revenue,
				orders: values.orders,
			}));

		const customerIds = topCustomersRaw.map((entry) => entry.customerId);
		const customers = customerIds.length
			? await neonClient.customer.findMany({
					where: {
						id: {
							in: customerIds,
						},
					},
					select: {
						id: true,
						companyName: true,
						firstName: true,
						lastName: true,
						status: true,
					},
				})
			: [];

		const topCustomers = topCustomersRaw.map((entry) => {
			const customer = customers.find((c) => c.id === entry.customerId);
			const displayName =
				customer?.companyName ||
				[customer?.firstName, customer?.lastName]
					.filter(Boolean)
					.join(" ") ||
				"Unknown customer";

			return {
				customerId: entry.customerId,
				name: displayName,
				orders: entry._count?._all ?? 0,
				spend: Number(entry._sum?.totalAmount ?? 0),
				lastOrder: entry._max?.orderDate?.toISOString() ?? null,
				status: customer?.status ?? null,
			};
		});

		const upcomingFulfillment = upcomingOrders
			.map((order) => {
				const items = order.items || [];
				const totalItems = items.reduce(
					(acc, item) => acc + (item.orderedQty ?? 0),
					0,
				);
				const remainingItems = items.reduce(
					(acc, item) => acc + (item.remainingQty ?? 0),
					0,
				);
				const customerName =
					order.customer?.companyName ||
					[order.customer?.firstName, order.customer?.lastName]
						.filter(Boolean)
						.join(" ") ||
					"Customer";
				const eta = order.promisedDate ?? order.requiredDate ?? null;

				return {
					orderId: order.id,
					orderNumber: order.orderNumber,
					customer: customerName,
					eta: eta ? eta.toISOString() : null,
					items: totalItems,
					remainingItems,
					priority: order.priority,
					status: order.fulfillmentStatus,
				};
			})
			.sort((a, b) => {
				if (a.eta && b.eta) return a.eta.localeCompare(b.eta);
				if (a.eta) return -1;
				if (b.eta) return 1;
				return 0;
			})
			.slice(0, 5);

		const totalOrderedQty = Number(orderItemAggregate._sum?.orderedQty ?? 0);
		const totalRemainingQty = Number(orderItemAggregate._sum?.remainingQty ?? 0);
		const totalShippedQty = Number(orderItemAggregate._sum?.shippedQty ?? 0);

		const backorderRate =
			totalOrderedQty > 0 ? totalRemainingQty / totalOrderedQty : 0;

		const onTimeDeliveryBase = deliveredOrdersForTiming.length;
		const onTimeDeliveryCount = deliveredOrdersForTiming.filter((order) => {
			if (!order.deliveredDate) {
				return false;
			}
			const targetDate =
				order.promisedDate ?? order.requiredDate ?? order.shippedDate;
			if (!targetDate) {
				return true;
			}
			return order.deliveredDate <= targetDate;
		}).length;
		const onTimeDeliveryRate =
			onTimeDeliveryBase > 0 ? onTimeDeliveryCount / onTimeDeliveryBase : 0;

		return actionSuccess({
			stats: {
				totalOrders,
				pendingOrders,
				shippedOrders,
				deliveredOrders: deliveredOrdersCount,
				totalRevenue,
				averageOrderValue,
				pendingPayments: pendingPaymentCount,
				fulfillmentEfficiency,
			},
			revenueTrend,
			topCustomers,
			upcomingFulfillment,
			operations: {
				backorderRate,
				onTimeDeliveryRate,
				pendingPaymentCount,
				awaitingShipmentCount,
				shippedItemsRatio:
					totalOrderedQty > 0 ? totalShippedQty / totalOrderedQty : 0,
				totalOrderedQty,
				totalRemainingQty,
			},
		});
	} catch (error) {
		console.error("Error fetching order analytics:", error);
		return actionError("Failed to fetch order analytics");
	}
}
