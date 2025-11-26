import { z } from "zod";

// Base brand schema (aligned with Neon Brand model)
export const baseBrandSchema = z.object({
	name: z
		.string()
		.min(1, "Brand name is required")
		.max(100, "Brand name too long"),
	description: z.string().optional(),
	logo: z.string().url().optional(),
	website: z.string().url().optional(),
	// Note: Brand model does NOT have contactEmail/contactPhone - removed
	isActive: z.boolean().default(true),
});

// Create brand schema (requires companyId for multi-tenancy)
export const createBrandSchema = baseBrandSchema.extend({
	companyId: z.string().uuid("Invalid company ID"),
});

// Update brand schema
export const updateBrandSchema = baseBrandSchema.partial().extend({
	id: z.string().uuid(),
});

// Query brands schema
export const brandQuerySchema = z.object({
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	search: z.string().optional(),
	isActive: z.boolean().optional(),
	sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("name"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Export types
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type BrandQueryInput = z.infer<typeof brandQuerySchema>;
