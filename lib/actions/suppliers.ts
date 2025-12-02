"use server";

import { neonClient } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { actionError, actionSuccess, type ActionResponse } from "@/lib/api-utils";
import {
	CreateSupplierSchema,
	UpdateSupplierSchema,
	SupplierFilterSchema,
	type CreateSupplierInput,
	type UpdateSupplierInput,
	type SupplierFilterInput,
} from "@/lib/validations/supplier";
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

			const { data: companyUser } = await supabase
				.from("company_users")
				.select("companyId")
				.eq("userId", userId)
				.eq("isActive", true)
				.single();

			if (companyUser) {
				companyId = companyUser.companyId;
			} else {
				const { data: ownedCompany } = await supabase
					.from("companies")
					.select("id")
					.eq("createdById", userId)
					.eq("isActive", true)
					.single();

				if (ownedCompany) {
					companyId = ownedCompany.id;
				} else {
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

// Create a new supplier
export async function createSupplier(
	data: CreateSupplierInput,
	context?: ActionContext,
): Promise<ActionResponse> {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { userId, companyId } = resolvedContext;

		const validatedData = CreateSupplierSchema.parse(data);

		// Check for duplicate code
		const existingSupplier = await neonClient.supplier.findFirst({
			where: {
				companyId,
				code: validatedData.code,
			},
		});

		if (existingSupplier) {
			return actionError("Supplier code already exists");
		}

		const supplier = await neonClient.supplier.create({
			data: {
				...validatedData,
				companyId,
				createdById: userId,
			},
			include: {
				productSuppliers: {
					include: {
						product: {
							select: { id: true, name: true, sku: true },
						},
					},
				},
			},
		});

		revalidatePath("/suppliers");
		revalidatePath("/inventory/suppliers");
		return actionSuccess(supplier, "Supplier created successfully");
	} catch (error) {
		console.error("Error creating supplier:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to create supplier");
	}
}

// Get all suppliers with filters and pagination
export async function getSuppliers(
	filters: Partial<SupplierFilterInput> = {},
	context?: ActionContext,
): Promise<ActionResponse> {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const validatedFilters = SupplierFilterSchema.parse({
			page: 1,
			limit: 20,
			...filters,
		});

		const { page, limit, search, status, sortBy, sortOrder } = validatedFilters;
		const skip = (page - 1) * limit;

		// Build where clause
		const where: Prisma.SupplierWhereInput = {
			companyId,
		};

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ code: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
			];
		}

		if (status) {
			where.status = status;
		}

		// Build order by
		const orderBy: Prisma.SupplierOrderByWithRelationInput = {};
		if (sortBy === "name") orderBy.name = sortOrder;
		else if (sortBy === "code") orderBy.code = sortOrder;
		else if (sortBy === "createdAt") orderBy.createdAt = sortOrder;
		else if (sortBy === "updatedAt") orderBy.updatedAt = sortOrder;

		const [suppliers, total] = await Promise.all([
			neonClient.supplier.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					productSuppliers: {
						include: {
							product: {
								select: { id: true, name: true, sku: true },
							},
						},
					},
					_count: {
						select: {
							productSuppliers: true,
							purchaseOrders: true,
						},
					},
				},
			}),
			neonClient.supplier.count({ where }),
		]);

		const pagination = {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		};

		return actionSuccess(
			{ suppliers, pagination },
			"Suppliers retrieved successfully",
		);
	} catch (error) {
		console.error("Error fetching suppliers:", error);
		return actionError("Failed to fetch suppliers");
	}
}

// Get supplier by ID
export async function getSupplierById(
	id: string,
	context?: ActionContext,
): Promise<ActionResponse> {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const supplier = await neonClient.supplier.findFirst({
			where: {
				id,
				companyId,
			},
			include: {
				productSuppliers: {
					include: {
						product: {
							select: { id: true, name: true, sku: true },
						},
					},
				},
				purchaseOrders: {
					orderBy: { createdAt: "desc" },
					take: 10,
					select: {
						id: true,
						orderNumber: true,
						status: true,
						totalAmount: true,
						createdAt: true,
					},
				},
				_count: {
					select: {
						productSuppliers: true,
						purchaseOrders: true,
					},
				},
			},
		});

		if (!supplier) {
			return actionError("Supplier not found");
		}

		return actionSuccess(supplier);
	} catch (error) {
		console.error("Error fetching supplier:", error);
		return actionError("Failed to fetch supplier");
	}
}

// Alias for getSupplierById for compatibility
export async function getSupplier(
	id: string,
	context?: ActionContext,
): Promise<ActionResponse> {
	return getSupplierById(id, context);
}

// Update supplier
export async function updateSupplier(
	id: string,
	data: UpdateSupplierInput,
	context?: ActionContext,
): Promise<ActionResponse> {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const validatedData = UpdateSupplierSchema.parse(data);

		// Check if supplier exists and belongs to company
		const existingSupplier = await neonClient.supplier.findFirst({
			where: {
				id,
				companyId,
			},
		});

		if (!existingSupplier) {
			return actionError("Supplier not found");
		}

		// If updating code, check for duplicates
		if (validatedData.code && validatedData.code !== existingSupplier.code) {
			const duplicateCode = await neonClient.supplier.findFirst({
				where: {
					companyId,
					code: validatedData.code,
					id: { not: id },
				},
			});

			if (duplicateCode) {
				return actionError("Supplier code already exists");
			}
		}

		const supplier = await neonClient.supplier.update({
			where: { id },
			data: validatedData,
			include: {
				productSuppliers: {
					include: {
						product: {
							select: { id: true, name: true, sku: true },
						},
					},
				},
			},
		});

		revalidatePath("/suppliers");
		revalidatePath("/inventory/suppliers");
		revalidatePath(`/inventory/suppliers/${id}`);
		return actionSuccess(supplier, "Supplier updated successfully");
	} catch (error) {
		console.error("Error updating supplier:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to update supplier");
	}
}

// Delete supplier
export async function deleteSupplier(
	id: string,
	context?: ActionContext,
): Promise<ActionResponse> {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		// Check if supplier exists and belongs to company
		const existingSupplier = await neonClient.supplier.findFirst({
			where: {
				id,
				companyId,
			},
			include: {
				productSuppliers: true,
				purchaseOrders: true,
			},
		});

		if (!existingSupplier) {
			return actionError("Supplier not found");
		}

		// Check if supplier has active relationships
		if (existingSupplier.productSuppliers.length > 0) {
			return actionError("Cannot delete supplier with associated products");
		}

		if (existingSupplier.purchaseOrders.length > 0) {
			return actionError("Cannot delete supplier with purchase order history");
		}

		await neonClient.supplier.delete({
			where: { id },
		});

		revalidatePath("/suppliers");
		revalidatePath("/inventory/suppliers");
		return actionSuccess(null, "Supplier deleted successfully");
	} catch (error) {
		console.error("Error deleting supplier:", error);
		return actionError("Failed to delete supplier");
	}
}

// Stub functions for removed features (SupplierContact model doesn't exist)
export async function createSupplierContact(_input: unknown): Promise<ActionResponse> {
	return actionError("SupplierContact feature not implemented");
}

export async function updateSupplierContact(_input: unknown): Promise<ActionResponse> {
	return actionError("SupplierContact feature not implemented");
}

export async function deleteSupplierContact(_id: string): Promise<ActionResponse> {
	return actionError("SupplierContact feature not implemented");
}
