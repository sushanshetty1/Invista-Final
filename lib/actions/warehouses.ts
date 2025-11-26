"use server";

import { supabaseClient } from "@/lib/prisma";
import {
	createWarehouseSchema,
	updateWarehouseSchema,
	warehouseQuerySchema,
	type CreateWarehouseInput,
	type UpdateWarehouseInput,
	type WarehouseQueryInput,
} from "@/lib/validations/warehouse";
import {
	actionSuccess,
	actionError,
	type ActionResponse,
} from "@/lib/api-utils";

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
		const { page, limit, search, type, isActive, sortBy, sortOrder } =
			validatedInput;

		const skip = (page - 1) * limit; // Build where clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {};

		// Add companyId filter if provided
		if (validatedInput.companyId) {
			where.companyId = validatedInput.companyId;
		}

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ code: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
			];
		}

		if (type !== undefined) {
			where.type = type;
		}

		if (isActive !== undefined) {
			where.isActive = isActive;
		} // Build orderBy clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const orderBy: any = {};
		if (sortBy === "name") {
			orderBy.name = sortOrder;
		} else if (sortBy === "code") {
			orderBy.code = sortOrder;
		} else if (sortBy === "type") {
			orderBy.type = sortOrder;
		} else if (sortBy === "createdAt") {
			orderBy.createdAt = sortOrder;
		} else if (sortBy === "updatedAt") {
			orderBy.updatedAt = sortOrder;
		}

		// Execute queries
		const [warehouses, total] = await Promise.all([
			supabaseClient.companyLocation.findMany({
				where,
				orderBy,
				skip,
				take: limit,
			}),
			supabaseClient.companyLocation.count({ where }),
		]);

		const totalPages = Math.ceil(total / limit);

		return actionSuccess(
			{
				warehouses,
				pagination: { page, limit, total, totalPages },
			},
			`Retrieved ${warehouses.length} warehouses`,
		);
	} catch {
		return actionError("Failed to fetch warehouses");
	}
}

// Get a single warehouse by ID
export async function getWarehouse(
	id: string,
	companyId?: string,
): Promise<ActionResponse<unknown>> {
	try {
		const where: any = { id };
		if (companyId) {
			where.companyId = companyId;
		}

		const warehouse = await supabaseClient.companyLocation.findFirst({
			where,
		});

		if (!warehouse) {
			return actionError("Warehouse not found");
		}

		return actionSuccess(warehouse, "Warehouse retrieved successfully");
	} catch {
		return actionError("Failed to fetch warehouse");
	}
}

// Create a new warehouse
export async function createWarehouse(
	input: CreateWarehouseInput,
): Promise<ActionResponse<unknown>> {
	try {
		const validatedInput = createWarehouseSchema.parse(input);
		const {
			name,
			code,
			description,
			type,
			address,
			contactName,
			contactEmail,
			contactPhone,
			isActive,
			companyId,
		} = validatedInput;

		// Check if warehouse code already exists
		const existingWarehouse = await supabaseClient.companyLocation.findFirst({
			where: { code, companyId },
		});

		if (existingWarehouse) {
			return actionError("Warehouse code already exists for this company");
		}

		const warehouse = await supabaseClient.companyLocation.create({
			data: {
				companyId,
				name,
				code,
				description,
				type,
				address,
				managerName: contactName,
				email: contactEmail,
				phone: contactPhone,
				isActive,
			},
		});

		return actionSuccess(warehouse, "Warehouse created successfully");
	} catch (error) {
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
		const {
			id,
			name,
			code,
			description,
			type,
			address,
			contactName,
			contactEmail,
			contactPhone,
			isActive,
		} = validatedInput;

		// Check if warehouse exists
		const existingWarehouse = await supabaseClient.companyLocation.findUnique({
			where: { id },
		});

		if (!existingWarehouse) {
			return actionError("Warehouse not found");
		}

		// Check if code change conflicts with existing warehouse
		if (code && code !== existingWarehouse.code) {
			const conflictingWarehouse = await supabaseClient.companyLocation.findFirst({
				where: {
					code,
					id: { not: id },
					companyId: existingWarehouse.companyId,
				},
			});

			if (conflictingWarehouse) {
				return actionError("Warehouse with this code already exists");
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (code !== undefined) updateData.code = code;
		if (description !== undefined) updateData.description = description;
		if (type !== undefined) updateData.type = type;
		if (address !== undefined) updateData.address = address;
		if (contactName !== undefined) updateData.managerName = contactName;
		if (contactEmail !== undefined) updateData.email = contactEmail;
		if (contactPhone !== undefined) updateData.phone = contactPhone;
		if (isActive !== undefined) updateData.isActive = isActive;
		updateData.updatedAt = new Date();

		const warehouse = await supabaseClient.companyLocation.update({
			where: { id },
			data: updateData,
		});

		return actionSuccess(warehouse, "Warehouse updated successfully");
	} catch (error) {
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
		const existingWarehouse = await supabaseClient.companyLocation.findUnique({
			where: { id },
		});

		if (!existingWarehouse) {
			return actionError("Warehouse not found");
		}

		// Note: Inventory items are in Neon DB, so we can't check the relation directly
		// The cascade delete will be handled at the database level if configured

		await supabaseClient.companyLocation.delete({
			where: { id },
		});

		return actionSuccess(undefined, "Warehouse deleted successfully");
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2003"
		) {
			return actionError(
				"Warehouse cannot be deleted due to existing references",
			);
		}

		return actionError("Failed to delete warehouse");
	}
}
