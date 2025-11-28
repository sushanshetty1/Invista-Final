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
            const supabase = await createClient();

            const { data: companyUser, error: companyError } = await supabase
                .from("company_users")
                .select("companyId")
                .eq("userId", userId)
                .eq("isActive", true)
                .single();

            if (companyUser) {
                companyId = companyUser.companyId;
            } else {
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

        // Validate warehouse if provided
        if (validatedData.warehouseId) {
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
                    subtotal: new Prisma.Decimal(subtotal),
                    discountAmount: new Prisma.Decimal(totalDiscountAmount),
                    totalAmount: new Prisma.Decimal(finalTotal),
                    shippingAddress: validatedData.shippingAddress,
                    trackingNumber: validatedData.trackingNumber,
                    carrier: validatedData.carrier,
                    notes: validatedData.notes,
                    createdById: userId,
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
                        shippedQty: 0,
                        unitPrice: new Prisma.Decimal(item.unitPrice),
                        totalPrice: new Prisma.Decimal(itemTotal),
                    },
                });
            }

            return order;
        });

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

        if (validatedFilters.paymentStatus) {
            where.paymentStatus = validatedFilters.paymentStatus;
        }

        if (validatedFilters.customerId) {
            where.customerId = validatedFilters.customerId;
        }

        if (validatedFilters.warehouseId) {
            where.warehouseId = validatedFilters.warehouseId;
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
                items: {
                    include: {
                        product: true,
                        variant: true,
                    },
                },
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

// Update order status
export async function updateOrderStatus(
    data: UpdateOrderStatusInput & { orderId: string },
    context?: ActionContext,
) {
    try {
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

        // Auto-update dates based on status
        if (validatedData.status === "SHIPPED") {
            updateData.shippedDate = validatedData.shippedDate || new Date();
        } else if (validatedData.status === "DELIVERED") {
            updateData.deliveredDate = validatedData.deliveredDate || new Date();
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
                items: true,
            },
        });

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
