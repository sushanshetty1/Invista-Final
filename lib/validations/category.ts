import { z } from "zod";

// Base category schema (aligned with Neon Category model)
export const baseCategorySchema = z.object({
	name: z
		.string()
		.min(1, "Category name is required")
		.max(100, "Category name too long"),
	description: z.string().optional(),
	slug: z.string().min(1, "Slug is required").max(100, "Slug too long"),
	parentId: z.string().uuid().optional(),
	displayOrder: z.number().int().default(0),
	icon: z.string().optional(),
	color: z
		.string()
		.regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
		.optional(),
	// Note: Category model does NOT have 'image' field - removed
	isActive: z.boolean().default(true),
});

// Create category schema (requires companyId for multi-tenancy)
export const createCategorySchema = baseCategorySchema.extend({
	companyId: z.string().uuid("Invalid company ID"),
});

// Update category schema
export const updateCategorySchema = baseCategorySchema.partial().extend({
	id: z.string().uuid(),
});

// Query categories schema
export const categoryQuerySchema = z.object({
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	search: z.string().optional(),
	parentId: z.string().uuid().optional(),
	level: z.number().int().min(0).optional(),
	isActive: z.boolean().optional(),
	sortBy: z.enum(["name", "level", "createdAt", "updatedAt"]).default("level"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Export types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
