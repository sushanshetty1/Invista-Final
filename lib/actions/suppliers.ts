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

		const validatedData = createSupplierSchema.parse(inputData);
		const { status, ...otherData } = validatedData;

		const supplier = await neonClient.supplier.create({
			data: {
				...otherData,
				companyId,
				address1: validatedData.billingAddress?.street,
				address2: undefined,
				city: validatedData.billingAddress?.city,
				state: validatedData.billingAddress?.state,
				postalCode: validatedData.billingAddress?.zipCode,
				country: validatedData.billingAddress?.country,
				createdById: "system",
				status:
					status === "PENDING_APPROVAL"
						? "ACTIVE"
						: status === "BLACKLISTED"
							? "SUSPENDED"
							: status,
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

		revalidatePath("/inventory/suppliers");
		revalidatePath(`/inventory/suppliers/${supplier.id}`);
		return actionSuccess(supplier, "Supplier updated successfully");
	} catch (error) {
		console.error("Error updating supplier:", error);
		return actionError("Failed to update supplier");
	}
}

// Get all suppliers with filters and pagination
export async function getSuppliers(
	filters: Partial<SupplierFilterInput> = {},
	context?: ActionContext,
) {
	try {
		const validatedData = updateSupplierSchema.parse(input);
		const { id, status, ...updateData } = validatedData;

		// Check if supplier exists
		const existingSupplier = await neonClient.supplier.findUnique({
			where: { id },
		});

		if (!existingSupplier) {
			return actionError("Supplier not found");
		}

		const supplier = await neonClient.supplier.update({
			where: { id },
			data: {
				...updateData,
				address1: updateData.billingAddress?.street,
				address2: undefined,
				city: updateData.billingAddress?.city,
				state: updateData.billingAddress?.state,
				postalCode: updateData.billingAddress?.zipCode,
				country: updateData.billingAddress?.country,
				status:
					status === "PENDING_APPROVAL"
						? "ACTIVE"
						: status === "BLACKLISTED"
							? "SUSPENDED"
							: status,
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

		revalidatePath("/inventory/suppliers");
		revalidatePath(`/inventory/suppliers/${id}`);
		return actionSuccess(supplier, "Supplier updated successfully");
	} catch (error) {
		console.error("Error updating supplier:", error);
		return actionError("Failed to update supplier");
	}
}

// Delete a supplier
export async function deleteSupplier(id: string): Promise<ActionResponse> {
	try {
		// Check if supplier exists
		const existingSupplier = await neonClient.supplier.findUnique({
			where: { id },
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

		revalidatePath("/inventory/suppliers");
		return actionSuccess(null, "Supplier deleted successfully");
	} catch (error) {
		console.error("Error deleting supplier:", error);
		return actionError("Failed to delete supplier");
	}
}

// Get suppliers with filtering and pagination
export async function getSuppliers(
	input: SupplierQueryInput,
): Promise<ActionResponse> {
	try {
		const validatedQuery = supplierQuerySchema.parse(input);
		const { page, limit, search, companyId, status, companyType, sortBy, sortOrder } =
			validatedQuery;

	const skip = (page - 1) * limit; // Build where clause
	const where: any = {};

	// Filter by company ID if provided
	if (companyId) where.companyId = companyId;

	if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ code: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
				{ contactName: { contains: search, mode: "insensitive" } },
			];
		}

		if (status) where.status = status;
		if (companyType) where.companyType = companyType; // Build order clause
		const orderBy: {
			name?: "asc" | "desc";
			code?: "asc" | "desc";
			rating?: "asc" | "desc";
			createdAt?: "asc" | "desc";
			updatedAt?: "asc" | "desc";
		} = {};
		if (sortBy === "name") {
			orderBy.name = sortOrder;
		} else if (sortBy === "code") {
			orderBy.code = sortOrder;
		} else if (sortBy === "rating") {
			orderBy.rating = sortOrder;
		} else if (sortBy === "createdAt") {
			orderBy.createdAt = sortOrder;
		} else if (sortBy === "updatedAt") {
			orderBy.updatedAt = sortOrder;
		}
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
					// contacts: { // Removed
					// 	where: { isPrimary: true },
					// 	take: 1,
					// },
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
				productSuppliers: {
					include: {
						product: {
							select: { id: true, name: true, sku: true }, // primaryImage removed from Product
						},
					},
				},
				// contacts: true, // Removed
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

		if (!existingRelationship) {
			return actionError("Product-supplier relationship not found");
		}

		await neonClient.productSupplier.delete({
			where: { id },
		});

		revalidatePath("/inventory/suppliers");
		revalidatePath(`/inventory/suppliers/${existingRelationship.supplierId}`);
		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${existingRelationship.productId}`);
		return actionSuccess(
			null,
			"Product-supplier relationship deleted successfully",
		);
	} catch (error) {
		console.error("Error deleting product-supplier relationship:", error);
		return actionError("Failed to delete product-supplier relationship");
	}
}

// Create supplier contact
// SupplierContact functions removed as model does not exist
export async function createSupplierContact(input: any) { return { success: false, error: "Not implemented" }; }
export async function updateSupplierContact(input: any) { return { success: false, error: "Not implemented" }; }
export async function deleteSupplierContact(id: string) { return { success: false, error: "Not implemented" }; }
