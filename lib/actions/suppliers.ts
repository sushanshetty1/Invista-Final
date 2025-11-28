"use server";

import { neonClient } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { actionError, actionSuccess } from "@/lib/api-utils";
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
) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { userId, companyId } = resolvedContext;

		// Validate input data
		const validatedData = CreateSupplierSchema.parse(data);

		// Check if supplier code already exists for this company
		const existingSupplier = await neonClient.supplier.findFirst({
			where: {
				companyId,
				code: validatedData.code,
			},
		});

		if (existingSupplier) {
			return actionError("Supplier code already exists");
		}

		// Create supplier
		const supplier = await neonClient.supplier.create({
			data: {
				companyId,
				name: validatedData.name,
				code: validatedData.code,
				email: validatedData.email,
				phone: validatedData.phone,
				website: validatedData.website,
				address1: validatedData.address1,
				address2: validatedData.address2,
				city: validatedData.city,
				state: validatedData.state,
				postalCode: validatedData.postalCode,
				country: validatedData.country,
				taxId: validatedData.taxId,
				paymentTerms: validatedData.paymentTerms,
				currency: validatedData.currency,
				status: validatedData.status,
				createdById: userId,
			},
		});

		revalidatePath("/suppliers");
		return actionSuccess(supplier);
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
) {
	try {
		const validatedFilters = SupplierFilterSchema.parse({
			page: 1,
			limit: 20,
			sortBy: "createdAt",
			sortOrder: "desc",
			...filters,
		});

		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		// Build where clause
		const where: Prisma.SupplierWhereInput = {
			companyId,
		};

		if (validatedFilters.status) {
			where.status = validatedFilters.status;
		}

		if (validatedFilters.search) {
			where.OR = [
				{
					name: {
						contains: validatedFilters.search,
						mode: "insensitive",
					},
				},
				{
					code: {
						contains: validatedFilters.search,
						mode: "insensitive",
					},
				},
				{
					email: {
						contains: validatedFilters.search,
						mode: "insensitive",
					},
				},
			];
		}

		// Calculate pagination
		const skip = (validatedFilters.page - 1) * validatedFilters.limit;

		// Get total count
		const totalCount = await neonClient.supplier.count({ where });

		// Get suppliers
		const suppliers = await neonClient.supplier.findMany({
			where,
			orderBy: {
				[validatedFilters.sortBy]: validatedFilters.sortOrder,
			},
			skip,
			take: validatedFilters.limit,
		});

		const totalPages = Math.ceil(totalCount / validatedFilters.limit);

		return actionSuccess({
			suppliers,
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
		console.error("Error fetching suppliers:", error);
		return actionError("Failed to fetch suppliers");
	}
}

// Get supplier by ID
export async function getSupplierById(id: string, context?: ActionContext) {
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

		if (!supplier) {
			return actionError("Supplier not found");
		}

		return actionSuccess(supplier);
	} catch (error) {
		console.error("Error fetching supplier:", error);
		return actionError("Failed to fetch supplier");
	}
}

// Update supplier
export async function updateSupplier(
	id: string,
	data: UpdateSupplierInput,
	context?: ActionContext,
) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		// Validate input data
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
					id: {
						not: id,
					},
				},
			});

			if (duplicateCode) {
				return actionError("Supplier code already exists");
			}
		}

		// Update supplier
		const supplier = await neonClient.supplier.update({
			where: { id },
			data: validatedData,
		});

		revalidatePath("/suppliers");
		return actionSuccess(supplier);
	} catch (error) {
		console.error("Error updating supplier:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to update supplier");
	}
}

// Delete supplier
export async function deleteSupplier(id: string, context?: ActionContext) {
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
		});

		if (!existingSupplier) {
			return actionError("Supplier not found");
		}

		// Check if supplier has purchase orders
		const purchaseOrderCount = await neonClient.purchaseOrder.count({
			where: {
				supplierId: id,
			},
		});

		if (purchaseOrderCount > 0) {
			return actionError(
				"Cannot delete supplier with existing purchase orders. Set status to INACTIVE instead.",
			);
		}

		// Delete supplier
		await neonClient.supplier.delete({
			where: { id },
		});

		revalidatePath("/suppliers");
		return actionSuccess({ message: "Supplier deleted successfully" });
	} catch (error) {
		console.error("Error deleting supplier:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to delete supplier");
	}
}

// Get supplier statistics
export async function getSupplierStats(context?: ActionContext) {
	try {
		const resolvedContext = await resolveActionContext(context);
		if ("error" in resolvedContext) {
			return actionError(resolvedContext.error);
		}
		const { companyId } = resolvedContext;

		const where: Prisma.SupplierWhereInput = {
			companyId,
		};

		const [totalSuppliers, activeSuppliers, inactiveSuppliers, suspendedSuppliers] =
			await Promise.all([
				neonClient.supplier.count({ where }),
				neonClient.supplier.count({
					where: {
						...where,
						status: "ACTIVE",
					},
				}),
				neonClient.supplier.count({
					where: {
						...where,
						status: "INACTIVE",
					},
				}),
				neonClient.supplier.count({
					where: {
						...where,
						status: "SUSPENDED",
					},
				}),
			]);

		return actionSuccess({
			stats: {
				totalSuppliers,
				activeSuppliers,
				inactiveSuppliers,
				suspendedSuppliers,
			},
		});
	} catch (error) {
		console.error("Error fetching supplier statistics:", error);
		return actionError("Failed to fetch supplier statistics");
	}
}
