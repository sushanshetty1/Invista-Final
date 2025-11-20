import { z } from "zod";

// Enums from Prisma schema
export const OrderTypeEnum = z.enum([
	"SALES",
	"RETURN",
	"EXCHANGE",
	"SAMPLE",
	"REPLACEMENT",
]);

export const OrderChannelEnum = z.enum([
	"DIRECT",
	"ONLINE",
	"PHONE",
	"EMAIL",
	"RETAIL",
	"WHOLESALE",
	"B2B_PORTAL",
]);

export const OrderStatusEnum = z.enum([
	"PENDING",
	"CONFIRMED",
	"PROCESSING",
	"SHIPPED",
	"DELIVERED",
	"CANCELLED",
	"RETURNED",
	"COMPLETED",
]);

export const FulfillmentStatusEnum = z.enum([
	"PENDING",
	"PICKING",
	"PACKED",
	"SHIPPED",
	"DELIVERED",
	"CANCELLED",
]);

export const PaymentStatusEnum = z.enum([
	"PENDING",
	"PROCESSING",
	"PAID",
	"PARTIALLY_PAID",
	"REFUNDED",
	"CANCELLED",
	"FAILED",
]);

export const OrderPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const OrderItemStatusEnum = z.enum([
	"PENDING",
	"RESERVED",
	"PICKING",
	"PICKED",
	"PACKED",
	"SHIPPED",
	"DELIVERED",
	"CANCELLED",
]);

// Order Item Schema
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

// Create Order Schema
export const CreateOrderSchema = z
	.object({
		customerId: z.string().uuid("Customer ID must be a valid UUID"),
		warehouseId: z.string().uuid("Warehouse ID must be a valid UUID"),
		type: OrderTypeEnum.default("SALES"),
		channel: OrderChannelEnum.default("DIRECT"),
		priority: OrderPriorityEnum.default("NORMAL"),
		requiredDate: z
			.string()
			.datetime("Invalid date format")
			.or(z.date())
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
		promisedDate: z
			.string()
			.datetime("Invalid date format")
			.or(z.date())
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
		shippingMethod: z.string().max(100).optional(),
		shippingAddress: z.string().max(1000).optional(),
		notes: z.string().max(1000).optional(),
		internalNotes: z.string().max(1000).optional(),
		rushOrder: z.boolean().default(false),
		items: z
			.array(OrderItemSchema)
			.min(1, "Order must contain at least one item")
			.max(100, "Order cannot contain more than 100 items"),
	})
	.refine(
		(data) => {
			// If requiredDate is provided, it should not be in the past (allow same day)
			if (data.requiredDate) {
				const now = new Date();
				// Set to start of today to allow same-day orders
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				const reqDate = new Date(data.requiredDate);
				const reqDay = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate());
				return reqDay >= today;
			}
			return true;
		},
		{
			message: "Required date cannot be in the past",
			path: ["requiredDate"],
		},
	);

// Update Order Schema
export const UpdateOrderSchema = z.object({
	customerId: z.string().uuid("Customer ID must be a valid UUID").optional(),
	warehouseId: z.string().uuid("Warehouse ID must be a valid UUID").optional(),
	type: OrderTypeEnum.optional(),
	channel: OrderChannelEnum.optional(),
	status: OrderStatusEnum.optional(),
	fulfillmentStatus: FulfillmentStatusEnum.optional(),
	paymentStatus: PaymentStatusEnum.optional(),
	priority: OrderPriorityEnum.optional(),
	requiredDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	promisedDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	shippedDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	deliveredDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	shippingMethod: z.string().max(100).optional(),
	trackingNumber: z.string().max(100).optional(),
	carrier: z.string().max(100).optional(),
	shippingAddress: z.string().max(1000).optional(),
	notes: z.string().max(1000).optional(),
	internalNotes: z.string().max(1000).optional(),
	rushOrder: z.boolean().optional(),
});

// Update Order Status Schema
export const UpdateOrderStatusSchema = z.object({
	status: OrderStatusEnum,
	fulfillmentStatus: FulfillmentStatusEnum.optional(),
	paymentStatus: PaymentStatusEnum.optional(),
	shippedDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	deliveredDate: z
		.string()
		.datetime("Invalid date format")
		.or(z.date())
		.optional()
		.transform((val) => (val ? new Date(val) : undefined)),
	trackingNumber: z.string().max(100).optional(),
	carrier: z.string().max(100).optional(),
});

// Order Filter Schema
export const OrderFilterSchema = z.object({
	status: OrderStatusEnum.optional(),
	fulfillmentStatus: FulfillmentStatusEnum.optional(),
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
	type: OrderTypeEnum.optional(),
	channel: OrderChannelEnum.optional(),
	priority: OrderPriorityEnum.optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10),
});

// Export types
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderFilterInput = z.infer<typeof OrderFilterSchema>;
export type OrderItemInput = z.infer<typeof OrderItemSchema>;
