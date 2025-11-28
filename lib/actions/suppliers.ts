"use server";

import { neonClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabaseServer";
import {
	createSupplierSchema,
	updateSupplierSchema,
	supplierQuerySchema,
	productSupplierSchema,
	updateProductSupplierSchema,
	supplierContactSchema,
	updateSupplierContactSchema,
	type CreateSupplierInput,
	type UpdateSupplierInput,
	type SupplierQueryInput,
	type ProductSupplierInput,
	type UpdateProductSupplierInput,
	type SupplierContactInput,
	type UpdateSupplierContactInput,
} from "@/lib/validations/supplier";
import {
	actionSuccess,
	actionError,
	type ActionResponse,
} from "@/lib/api-utils";
import { revalidatePath } from "next/cache";

// Create a new supplier
export async function createSupplier(
	input: CreateSupplierInput & { companyId?: string; userId?: string },
): Promise<ActionResponse> {
	try {
		// Extract companyId and userId if provided (from API route)
		const { companyId: providedCompanyId, userId: _providedUserId, ...inputData } = input;
		
		let companyId = providedCompanyId;
		
		// If not provided, try to get from session (for direct server action calls)
		if (!companyId) {
			const supabase = await createClient();
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			
			if (userError || !user?.id) {
				console.error("Authentication error:", userError);
				return actionError("Authentication required");
			}

			// Get user's company from company_users table in Supabase
			const { data: companyUser, error: companyError } = await supabase
				.from("company_users")
				.select("companyId")
				.eq("userId", user.id)
				.eq("isActive", true)
				.single();

			if (companyError || !companyUser) {
				console.error("Company lookup error:", companyError);
				return actionError("User not associated with any company");
			}
			
			companyId = companyUser.companyId;
		}

		if (!companyId) {
			return actionError("User not associated with any company");
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

// Update an existing supplier
export async function updateSupplier(
	input: UpdateSupplierInput,
): Promise<ActionResponse> {
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

// Get a single supplier by ID
export async function getSupplier(id: string): Promise<ActionResponse> {
	try {
		const supplier = await neonClient.supplier.findUnique({
			where: { id },
			include: {
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

		return actionSuccess(supplier, "Supplier retrieved successfully");
	} catch (error) {
		console.error("Error fetching supplier:", error);
		return actionError("Failed to fetch supplier");
	}
}

// Create product-supplier relationship
export async function createProductSupplier(
	input: ProductSupplierInput,
): Promise<ActionResponse> {
	try {
		const validatedData = productSupplierSchema.parse(input);

		// Check if product and supplier exist
		const [product, supplier] = await Promise.all([
			neonClient.product.findUnique({ where: { id: validatedData.productId } }),
			neonClient.supplier.findUnique({
				where: { id: validatedData.supplierId },
			}),
		]);

		if (!product) {
			return actionError("Product not found");
		}

		if (!supplier) {
			return actionError("Supplier not found");
		}

		const productSupplier = await neonClient.productSupplier.create({
			data: validatedData,
			include: {
				product: {
					select: { id: true, name: true, sku: true },
				},
				supplier: {
					select: { id: true, name: true, code: true },
				},
			},
		});

		revalidatePath("/inventory/suppliers");
		revalidatePath(`/inventory/suppliers/${validatedData.supplierId}`);
		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${validatedData.productId}`);
		return actionSuccess(
			productSupplier,
			"Product-supplier relationship created successfully",
		);
	} catch (error) {
		console.error("Error creating product-supplier relationship:", error);
		return actionError("Failed to create product-supplier relationship");
	}
}

// Update product-supplier relationship
export async function updateProductSupplier(
	input: UpdateProductSupplierInput,
): Promise<ActionResponse> {
	try {
		const validatedData = updateProductSupplierSchema.parse(input);
		const { id, ...updateData } = validatedData;

		// Check if relationship exists
		const existingRelationship = await neonClient.productSupplier.findUnique({
			where: { id },
			include: {
				product: true,
				supplier: true,
			},
		});

		if (!existingRelationship) {
			return actionError("Product-supplier relationship not found");
		}

		const productSupplier = await neonClient.productSupplier.update({
			where: { id },
			data: updateData,
			include: {
				product: {
					select: { id: true, name: true, sku: true },
				},
				supplier: {
					select: { id: true, name: true, code: true },
				},
			},
		});

		revalidatePath("/inventory/suppliers");
		revalidatePath(`/inventory/suppliers/${existingRelationship.supplierId}`);
		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${existingRelationship.productId}`);
		return actionSuccess(
			productSupplier,
			"Product-supplier relationship updated successfully",
		);
	} catch (error) {
		console.error("Error updating product-supplier relationship:", error);
		return actionError("Failed to update product-supplier relationship");
	}
}

// Delete product-supplier relationship
export async function deleteProductSupplier(
	id: string,
): Promise<ActionResponse> {
	try {
		// Check if relationship exists
		const existingRelationship = await neonClient.productSupplier.findUnique({
			where: { id },
			include: {
				product: true,
				supplier: true,
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
