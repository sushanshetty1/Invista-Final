import { z } from "zod";

// Enums matching Prisma schema exactly
export const OrderStatusEnum = z.enum([
	"PENDING",
	"CONFIRMED",
	"PROCESSING",
	"SHIPPED",
	"DELIVERED",
	"CANCELLED",
	"RETURNED",
]);

export const PaymentStatusEnum = z.enum([
	"PENDING",
	"PAID",
	"PARTIALLY_PAID",
	"FAILED",
	"REFUNDED",
]);

// Order Item Schema - matching Prisma OrderItem model
export const OrderItemSchema = z.object({
	productId: z.string().uuid("Product ID must be a valid UUID"),
	variantId: z.string().uuid("Variant ID must be a valid UUID").optional(),
	quantity: z.number().int().positive("Quantity must be a positive integer"),
	unitPrice: z
		.number()
		.positive("Unit price must be positive")
		.multipleOf(0.01, "Unit price must have at most 2 decimal places"),
	discountAmount: z
		.number()
		.min(0, "Discount amount cannot be negative")
		.multipleOf(0.01, "Discount amount must have at most 2 decimal places")
		.default(0),
});

// Create Order Schema - matching Prisma Order model
export const CreateOrderSchema = z.object({
	customerId: z.string().uuid("Customer ID must be a valid UUID"),
	warehouseId: z.string().uuid("Warehouse ID must be a valid UUID").optional().nullable(),
	shippingAddress: z.any().optional().nullable(), // JSON field in Prisma
	trackingNumber: z.string().max(100).optional().nullable(),
	carrier: z.string().max(100).optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
	items: z
		.array(OrderItemSchema)
		.min(1, "Order must contain at least one item")
		.max(100, "Order cannot contain more than 100 items"),
});

// Update Order Schema - matching Prisma Order model
export const UpdateOrderSchema = z.object({
	customerId: z.string().uuid("Customer ID must be a valid UUID").optional(),
	warehouseId: z.string().uuid("Warehouse ID must be a valid UUID").optional().nullable(),
	status: OrderStatusEnum.optional(),
	paymentStatus: PaymentStatusEnum.optional(),
	shippedDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	deliveredDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	trackingNumber: z.string().max(100).optional().nullable(),
	carrier: z.string().max(100).optional().nullable(),
	shippingAddress: z.any().optional().nullable(), // JSON field in Prisma
	notes: z.string().max(1000).optional().nullable(),
});

// Update Order Status Schema - for status updates
export const UpdateOrderStatusSchema = z.object({
	status: OrderStatusEnum,
	paymentStatus: PaymentStatusEnum.optional(),
	shippedDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	deliveredDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	trackingNumber: z.string().max(100).optional().nullable(),
	carrier: z.string().max(100).optional().nullable(),
});

// Order Filter Schema - for querying orders
export const OrderFilterSchema = z.object({
	status: OrderStatusEnum.optional(),
	paymentStatus: PaymentStatusEnum.optional(),
	customerId: z.string().uuid().optional(),
	warehouseId: z.string().uuid().optional(),
	dateFrom: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	dateTo: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	searchTerm: z.string().max(100).optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
});

// Export types
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderFilterInput = z.infer<typeof OrderFilterSchema>;
export type OrderItemInput = z.infer<typeof OrderItemSchema>;
