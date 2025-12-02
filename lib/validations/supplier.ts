import { z } from "zod";

// Enum matching Prisma schema exactly
export const SupplierStatusEnum = z.enum([
	"ACTIVE",
	"INACTIVE",
	"SUSPENDED",
]);

// Create Supplier Schema - matching Prisma Supplier model
export const CreateSupplierSchema = z.object({
	name: z.string().min(1, "Supplier name is required").max(255),
	code: z.string().min(1, "Supplier code is required").max(50),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	website: z.string().url().optional().or(z.literal("")).nullable(),

	// Structured address fields (not JSON)
	address1: z.string().optional().nullable(),
	address2: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	state: z.string().optional().nullable(),
	postalCode: z.string().optional().nullable(),
	country: z.string().optional().nullable(),

	// Business info
	taxId: z.string().optional().nullable(),
	paymentTerms: z.string().optional().nullable(),
	currency: z.string().length(3).default("USD"),

	status: SupplierStatusEnum.default("ACTIVE"),
});

// Update Supplier Schema
export const UpdateSupplierSchema = z.object({
	name: z.string().min(1, "Supplier name is required").max(255).optional(),
	code: z.string().min(1, "Supplier code is required").max(50).optional(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
	website: z.string().url().optional().or(z.literal("")).nullable(),

	address1: z.string().optional().nullable(),
	address2: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	state: z.string().optional().nullable(),
	postalCode: z.string().optional().nullable(),
	country: z.string().optional().nullable(),

	taxId: z.string().optional().nullable(),
	paymentTerms: z.string().optional().nullable(),
	currency: z.string().length(3).optional(),

	status: SupplierStatusEnum.optional(),
});

// Supplier Query/Filter Schema
export const SupplierFilterSchema = z.object({
	status: SupplierStatusEnum.optional(),
	search: z.string().optional(),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	sortBy: z.enum(["name", "code", "createdAt", "updatedAt"]).default("createdAt"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Product Supplier Schema - matching Prisma ProductSupplier model
export const ProductSupplierSchema = z.object({
	productId: z.string().uuid("Invalid product ID"),
	supplierId: z.string().uuid("Invalid supplier ID"),
	supplierSku: z.string().optional().nullable(),
	unitCost: z.number().positive("Unit cost must be positive"),
	leadTimeDays: z.number().int().positive().optional().nullable(),
	isPreferred: z.boolean().default(false),
});

export const UpdateProductSupplierSchema = ProductSupplierSchema.partial().extend({
	id: z.string().uuid("Invalid product supplier ID"),
});

// Export types
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
export type SupplierFilterInput = z.infer<typeof SupplierFilterSchema>;
export type ProductSupplierInput = z.infer<typeof ProductSupplierSchema>;
export type UpdateProductSupplierInput = z.infer<typeof UpdateProductSupplierSchema>;

// Lowercase aliases for backwards compatibility
export const createSupplierSchema = CreateSupplierSchema;
export const updateSupplierSchema = UpdateSupplierSchema;
export const supplierFilterSchema = SupplierFilterSchema;
export const baseSupplierSchema = CreateSupplierSchema;
