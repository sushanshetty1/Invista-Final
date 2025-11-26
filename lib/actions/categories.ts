// Simplified categories actions with schema-compliant code
// This is a temporary fix - the full implementation is in categories.ts.backup

import { z } from "zod";
import { neonClient } from "@/lib/prisma";
import { actionError, actionSuccess, type ActionResponse } from "@/lib/api-utils";
import type { Prisma } from "../../prisma/generated/neon";

// Validation schemas (aligned with Neon Category model)
export const createCategorySchema = z.object({
	companyId: z.string().uuid("Invalid company ID"),
	name: z.string().min(1, "Category name is required"),
	description: z.string().optional(),
	slug: z.string().min(1, "Slug is required"),
	parentId: z.string().optional(),
	displayOrder: z.number().int().default(0),
	icon: z.string().optional(),
	color: z.string().optional(),
	isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
	id: z.string().uuid(),
});

// Export types that might be used elsewhere
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// Get categories with pagination
export async function getCategories(params: {
	page?: number;
	limit?: number;
	search?: string;
	parentId?: string | null;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}): Promise<ActionResponse<unknown>> {
	try {
		const {
			page = 1,
			limit = 10,
			search,
			parentId,
			sortBy = "name",
			sortOrder = "asc",
		} = params;

		const skip = (page - 1) * limit;

		// Build where clause
		const where: Prisma.CategoryWhereInput = {};
		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
			];
		}
		if (parentId !== undefined) {
			where.parentId = parentId;
		}

		// Build orderBy
		const orderBy: Prisma.CategoryOrderByWithRelationInput = {};
		if (sortBy === "name") {
			orderBy.name = sortOrder;
		} else if (sortBy === "createdAt") {
			orderBy.createdAt = sortOrder;
		} else if (sortBy === "updatedAt") {
			orderBy.updatedAt = sortOrder;
		}

		// Execute queries with parent and children relationships
		const [rawCategories, total] = await Promise.all([
			neonClient.category.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					parent: true,
					children: true,
				},
			}),
			neonClient.category.count({ where }),
		]);

		// Calculate product count for each category
		const categories = await Promise.all(
			rawCategories.map(async (category) => {
				const productCount = await neonClient.product.count({
					where: { categoryId: category.id },
				});

				return {
					...category,
					productCount,
					// Map isActive to status for frontend compatibility
					status: category.isActive ? ("ACTIVE" as const) : ("INACTIVE" as const),
				};
			})
		);

		const totalPages = Math.ceil(total / limit);

		return actionSuccess(
			{
				categories,
				pagination: {
					page,
					limit,
					total,
					totalPages,
				},
			},
			"Categories retrieved successfully",
		);
	} catch (error) {
		console.error("Error fetching categories:", error);
		return actionError("Failed to fetch categories");
	}
}

// Get single category
export async function getCategory(id: string): Promise<ActionResponse<unknown>> {
	try {
		const category = await neonClient.category.findUnique({
			where: { id },
		});

		if (!category) {
			return actionError("Category not found");
		}

		return actionSuccess(category, "Category retrieved successfully");
	} catch (error) {
		console.error("Error fetching category:", error);
		return actionError("Failed to fetch category");
	}
}

// Create category
export async function createCategory(
	input: z.infer<typeof createCategorySchema>,
): Promise<ActionResponse<unknown>> {
	try {
		const validatedInput = createCategorySchema.parse(input);
		const {
			name,
			description,
			slug,
			parentId,
			color,
			icon,
			isActive,
			companyId,
		} = validatedInput;

		// Check if slug already exists for this company
		const existingCategory = await neonClient.category.findFirst({
			where: { companyId, slug },
		});

		if (existingCategory) {
			return actionError("Category with this slug already exists");
		}

		// Note: Category does NOT have 'image' or 'level' fields
		// It has 'icon' and 'displayOrder' instead
		const category = await neonClient.category.create({
			data: {
				companyId,
				name,
				description,
				slug,
				parentId,
				color,
				icon,
				isActive,
			},
		});

		return actionSuccess(category, "Category created successfully");
	} catch (error) {
		console.error("Error creating category:", error);
		if (error instanceof z.ZodError) {
			return actionError("Validation failed");
		}
		return actionError("Failed to create category");
	}
}

// Update category
export async function updateCategory(
	id: string,
	input: z.infer<typeof updateCategorySchema>,
): Promise<ActionResponse<unknown>> {
	try {
		const validatedInput = updateCategorySchema.parse(input);

		// Check if category exists
		const existingCategory = await neonClient.category.findUnique({
			where: { id },
		});

		if (!existingCategory) {
			return actionError("Category not found");
		}

		// Build update data
		const updateData: Prisma.CategoryUpdateInput = {};
		Object.keys(validatedInput).forEach((key) => {
			const value = (validatedInput as Record<string, unknown>)[key];
			if (value !== undefined) {
				(updateData as Record<string, unknown>)[key] = value;
			}
		});

		const category = await neonClient.category.update({
			where: { id },
			data: updateData,
		});

		return actionSuccess(category, "Category updated successfully");
	} catch (error) {
		console.error("Error updating category:", error);
		if (error instanceof z.ZodError) {
			return actionError("Validation failed");
		}
		return actionError("Failed to update category");
	}
}

// Delete category
export async function deleteCategory(id: string): Promise<ActionResponse<unknown>> {
	try {
		// Check if category exists
		const existingCategory = await neonClient.category.findUnique({
			where: { id },
		});

		if (!existingCategory) {
			return actionError("Category not found");
		}

		// Check if category has children (simplified check)
		const childrenCount = await neonClient.category.count({
			where: { parentId: id },
		});

		if (childrenCount > 0) {
			return actionError("Cannot delete category with child categories");
		}

		// Check if category has products (simplified check)
		const productCount = await neonClient.product.count({
			where: { categoryId: id },
		});

		if (productCount > 0) {
			return actionError("Cannot delete category with associated products");
		}

		await neonClient.category.delete({
			where: { id },
		});

		return actionSuccess(null, "Category deleted successfully");
	} catch (error) {
		console.error("Error deleting category:", error);
		return actionError("Failed to delete category");
	}
}
