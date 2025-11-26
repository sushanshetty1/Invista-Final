"use server";

import { neonClient } from "@/lib/prisma";
import { WarehouseType } from "@/prisma/generated/neon";
import {
	actionSuccess,
	actionError,
	type ActionResponse,
} from "@/lib/api-utils";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS (aligned with Neon Warehouse model)
// ============================================================================

// Warehouse types from Neon schema
const warehouseTypeEnum = z.enum([
	"STANDARD",
	"DISTRIBUTION_CENTER",
	"RETAIL_STORE",
	"COLD_STORAGE",
	"FULFILLMENT_CENTER",
]);

// Create warehouse schema
const createWarehouseSchema = z.object({
	companyId: z.string().uuid("Invalid company ID"),
	name: z.string().min(1, "Warehouse name is required").max(100),
	code: z.string().min(1, "Warehouse code is required").max(20),
	description: z.string().optional(),
	type: warehouseTypeEnum.default("STANDARD"),
	// Structured address fields
	address1: z.string().optional(),
	address2: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	postalCode: z.string().optional(),
	country: z.string().optional(),
	// Coordinates
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	isActive: z.boolean().default(true),
});

// Update warehouse schema
const updateWarehouseSchema = createWarehouseSchema.partial().extend({
	id: z.string().uuid(),
});

// Query warehouses schema
const warehouseQuerySchema = z.object({
	companyId: z.string().uuid().optional(),
	page: z.number().int().min(1).default(1),
	limit: z.number().int().min(1).max(100).default(20),
	search: z.string().optional(),
	type: warehouseTypeEnum.optional(),
	isActive: z.boolean().optional(),
	sortBy: z.enum(["name", "code", "type", "createdAt", "updatedAt"]).default("name"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Export types
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type WarehouseQueryInput = z.infer<typeof warehouseQuerySchema>;

// ============================================================================
// SERVER ACTIONS
// ============================================================================

// Get warehouses with filtering and pagination
export async function getWarehouses(input: WarehouseQueryInput): Promise<
	ActionResponse<{
		warehouses: unknown[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}>
> {
	try {
		const validatedInput = warehouseQuerySchema.parse(input);
		const { page, limit, search, type, isActive, sortBy, sortOrder, companyId } =
			validatedInput;

		const skip = (page - 1) * limit;

		// Build where clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {};

		if (companyId) {
			where.companyId = companyId;
		}

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ code: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
				{ city: { contains: search, mode: "insensitive" } },
			];
		}

		if (type !== undefined) {
			where.type = type;
		}

		if (isActive !== undefined) {
			where.isActive = isActive;
		}

		// Build orderBy clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const orderBy: any = {};
		orderBy[sortBy] = sortOrder;

		// Execute queries using Neon client
		const [warehouses, total] = await Promise.all([
			neonClient.warehouse.findMany({
				where,
				orderBy,
				skip,
				take: limit,
			}),
			neonClient.warehouse.count({ where }),
		]);

		const totalPages = Math.ceil(total / limit);

		return actionSuccess(
			{
				warehouses,
				pagination: { page, limit, total, totalPages },
			},
			`Retrieved ${warehouses.length} warehouses`,
		);
	} catch (error) {
		console.error("Error fetching warehouses:", error);
		return actionError("Failed to fetch warehouses");
	}
}

// Get a single warehouse by ID
export async function getWarehouse(
	id: string,
	companyId?: string,
): Promise<ActionResponse<unknown>> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = { id };
		if (companyId) {
			where.companyId = companyId;
		}

		const warehouse = await neonClient.warehouse.findFirst({
			where,
			include: {
				inventory: {
					take: 10,
					include: {
						product: {
							select: {
								id: true,
								name: true,
								sku: true,
							},
						},
					},
				},
			},
		});

		if (!warehouse) {
			return actionError("Warehouse not found");
		}

		return actionSuccess(warehouse, "Warehouse retrieved successfully");
	} catch (error) {
		console.error("Error fetching warehouse:", error);
		return actionError("Failed to fetch warehouse");
	}
}

// Get warehouse by code
export async function getWarehouseByCode(
	code: string,
	companyId: string,
): Promise<ActionResponse<unknown>> {
	try {
		const warehouse = await neonClient.warehouse.findUnique({
			where: {
				companyId_code: { companyId, code },
			},
		});

		if (!warehouse) {
			return actionError("Warehouse not found");
		}

		return actionSuccess(warehouse, "Warehouse retrieved successfully");
	} catch (error) {
		console.error("Error fetching warehouse by code:", error);
		return actionError("Failed to fetch warehouse");
	}
}

// Create a new warehouse
export async function createWarehouse(
	input: CreateWarehouseInput,
): Promise<ActionResponse<unknown>> {
	try {
		const validatedInput = createWarehouseSchema.parse(input);

		// Check if warehouse code already exists for this company
		const existingWarehouse = await neonClient.warehouse.findUnique({
			where: {
				companyId_code: {
					companyId: validatedInput.companyId,
					code: validatedInput.code,
				},
			},
		});

		if (existingWarehouse) {
			return actionError("Warehouse code already exists for this company");
		}

		const warehouse = await neonClient.warehouse.create({
			data: {
				companyId: validatedInput.companyId,
				name: validatedInput.name,
				code: validatedInput.code,
				description: validatedInput.description,
				type: validatedInput.type as WarehouseType,
				address1: validatedInput.address1,
				address2: validatedInput.address2,
				city: validatedInput.city,
				state: validatedInput.state,
				postalCode: validatedInput.postalCode,
				country: validatedInput.country,
				latitude: validatedInput.latitude,
				longitude: validatedInput.longitude,
				isActive: validatedInput.isActive,
			},
		});

		return actionSuccess(warehouse, "Warehouse created successfully");
	} catch (error) {
		console.error("Error creating warehouse:", error);
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2002"
		) {
			return actionError("Warehouse with this code already exists");
		}
		return actionError("Failed to create warehouse");
	}
}

// Update a warehouse
export async function updateWarehouse(
	input: UpdateWarehouseInput,
): Promise<ActionResponse<unknown>> {
	try {
		const validatedInput = updateWarehouseSchema.parse(input);
		const { id, ...updateFields } = validatedInput;

		// Check if warehouse exists
		const existingWarehouse = await neonClient.warehouse.findUnique({
			where: { id },
		});

		if (!existingWarehouse) {
			return actionError("Warehouse not found");
		}

		// Check if code change conflicts with existing warehouse
		if (updateFields.code && updateFields.code !== existingWarehouse.code) {
			const conflictingWarehouse = await neonClient.warehouse.findFirst({
				where: {
					code: updateFields.code,
					companyId: existingWarehouse.companyId,
					id: { not: id },
				},
			});

			if (conflictingWarehouse) {
				return actionError("Warehouse with this code already exists");
			}
		}

		// Build update data
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {};

		if (updateFields.name !== undefined) updateData.name = updateFields.name;
		if (updateFields.code !== undefined) updateData.code = updateFields.code;
		if (updateFields.description !== undefined) updateData.description = updateFields.description;
		if (updateFields.type !== undefined) updateData.type = updateFields.type;
		if (updateFields.address1 !== undefined) updateData.address1 = updateFields.address1;
		if (updateFields.address2 !== undefined) updateData.address2 = updateFields.address2;
		if (updateFields.city !== undefined) updateData.city = updateFields.city;
		if (updateFields.state !== undefined) updateData.state = updateFields.state;
		if (updateFields.postalCode !== undefined) updateData.postalCode = updateFields.postalCode;
		if (updateFields.country !== undefined) updateData.country = updateFields.country;
		if (updateFields.latitude !== undefined) updateData.latitude = updateFields.latitude;
		if (updateFields.longitude !== undefined) updateData.longitude = updateFields.longitude;
		if (updateFields.isActive !== undefined) updateData.isActive = updateFields.isActive;

		const warehouse = await neonClient.warehouse.update({
			where: { id },
			data: updateData,
		});

		return actionSuccess(warehouse, "Warehouse updated successfully");
	} catch (error) {
		console.error("Error updating warehouse:", error);
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2002"
		) {
			return actionError("Warehouse with this code already exists");
		}
		return actionError("Failed to update warehouse");
	}
}

// Delete a warehouse
export async function deleteWarehouse(
	id: string,
): Promise<ActionResponse<unknown>> {
	try {
		// Check if warehouse exists
		const existingWarehouse = await neonClient.warehouse.findUnique({
			where: { id },
		});

		if (!existingWarehouse) {
			return actionError("Warehouse not found");
		}

		// Check if warehouse has inventory items
		const inventoryCount = await neonClient.inventoryItem.count({
			where: { warehouseId: id },
		});

		if (inventoryCount > 0) {
			return actionError(
				`Cannot delete warehouse: ${inventoryCount} inventory items exist. Please transfer or remove inventory first.`,
			);
		}

		await neonClient.warehouse.delete({
			where: { id },
		});

		return actionSuccess(undefined, "Warehouse deleted successfully");
	} catch (error) {
		console.error("Error deleting warehouse:", error);
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2003"
		) {
			return actionError(
				"Warehouse cannot be deleted due to existing inventory references",
			);
		}
		return actionError("Failed to delete warehouse");
	}
}

// Get warehouse statistics
export async function getWarehouseStats(
	warehouseId: string,
): Promise<ActionResponse<unknown>> {
	try {
		const warehouse = await neonClient.warehouse.findUnique({
			where: { id: warehouseId },
		});

		if (!warehouse) {
			return actionError("Warehouse not found");
		}

		// Get inventory statistics
		const [
			totalItems,
			totalQuantity,
			outOfStockItems,
		] = await Promise.all([
			neonClient.inventoryItem.count({
				where: { warehouseId },
			}),
			neonClient.inventoryItem.aggregate({
				where: { warehouseId },
				_sum: { quantity: true },
			}),
			neonClient.inventoryItem.count({
				where: {
					warehouseId,
					quantity: 0,
				},
			}),
		]);

		const stats = {
			warehouse,
			totalItems,
			totalQuantity: totalQuantity._sum.quantity || 0,
			outOfStockItems,
		};

		return actionSuccess(stats, "Warehouse statistics retrieved successfully");
	} catch (error) {
		console.error("Error fetching warehouse stats:", error);
		return actionError("Failed to fetch warehouse statistics");
	}
}

// Get all warehouses for a company (simple list)
export async function getCompanyWarehouses(
	companyId: string,
): Promise<ActionResponse<unknown[]>> {
	try {
		const warehouses = await neonClient.warehouse.findMany({
			where: {
				companyId,
				isActive: true,
			},
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				code: true,
				type: true,
				city: true,
				state: true,
				isActive: true,
			},
		});

		return actionSuccess(warehouses, `Retrieved ${warehouses.length} warehouses`);
	} catch (error) {
		console.error("Error fetching company warehouses:", error);
		return actionError("Failed to fetch warehouses");
	}
}
