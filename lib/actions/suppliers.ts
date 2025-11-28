"use server";

import { neonClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabaseServer";
import {
	createSupplierSchema,
	updateSupplierSchema,
	supplierQuerySchema,
	productSupplierSchema,
	updateProductSupplierSchema,
	type CreateSupplierInput,
	type UpdateSupplierInput,
	type SupplierQueryInput,
	type ProductSupplierInput,
	type UpdateProductSupplierInput,
} from "@/lib/validations/supplier";
import {
	actionSuccess,
	actionError,
	type ActionResponse,
} from "@/lib/api-utils";
import { revalidatePath } from "next/cache";

// Helper to extract address fields from a JSON address object
function extractAddressFields(address?: {
	street?: string;
	city?: string;
	state?: string;
	country?: string;
	zipCode?: string;
}) {
	if (!address) return {};
	return {
		address1: address.street,
		city: address.city,
		state: address.state,
		country: address.country,
		postalCode: address.zipCode,
	};
}

// Create a new supplier
export async function createSupplier(
	input: CreateSupplierInput & { companyId?: string; userId?: string },
): Promise<ActionResponse> {
	try {
		// Extract companyId and userId if provided (from API route)
		const { companyId: providedCompanyId, userId: providedUserId, ...inputData } = input;
		
		let companyId = providedCompanyId;
		let userId = providedUserId;
		
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

			userId = user.id;

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

		if (!userId) {
			return actionError("User ID is required");
		}

		const validatedData = createSupplierSchema.parse(inputData);

		// Extract address fields from billing address
		const addressFields = extractAddressFields(validatedData.billingAddress);

		const supplier = await neonClient.supplier.create({
			data: {
				name: validatedData.name,
				code: validatedData.code,
				email: validatedData.email,
				phone: validatedData.phone,
				website: validatedData.website,
				taxId: validatedData.taxId,
				paymentTerms: validatedData.paymentTerms,
				currency: validatedData.currency || "USD",
				status: validatedData.status === "ACTIVE" ? "ACTIVE" : 
				        validatedData.status === "INACTIVE" ? "INACTIVE" : 
				        validatedData.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
				companyId,
				createdById: userId,
				// Structured address fields (not JSON)
				...addressFields,
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
		return actionSuccess(supplier, "Supplier created successfully");
	} catch (error) {
		console.error("Error creating supplier:", error);
		if (error instanceof Error) {
			return actionError(error.message);
		}
		return actionError("Failed to create supplier");
	}
}

// Update an existing supplier
export async function updateSupplier(
	input: UpdateSupplierInput,
): Promise<ActionResponse> {
	try {
		const validatedData = updateSupplierSchema.parse(input);
		const { id, billingAddress, shippingAddress, ...updateData } = validatedData;

		// Check if supplier exists
		const existingSupplier = await neonClient.supplier.findUnique({
			where: { id },
		});

		if (!existingSupplier) {
			return actionError("Supplier not found");
		}

		// Extract address fields from billing address if provided
		const addressFields = billingAddress ? extractAddressFields(billingAddress) : {};

		// Map status to valid enum values
		const statusMapping: Record<string, "ACTIVE" | "INACTIVE" | "SUSPENDED"> = {
			ACTIVE: "ACTIVE",
			INACTIVE: "INACTIVE",
			SUSPENDED: "SUSPENDED",
			PENDING_APPROVAL: "INACTIVE",
			BLACKLISTED: "SUSPENDED",
		};

		const supplier = await neonClient.supplier.update({
			where: { id },
			data: {
				name: updateData.name,
				code: updateData.code,
				email: updateData.email,
				phone: updateData.phone,
				website: updateData.website,
				taxId: updateData.taxId,
				paymentTerms: updateData.paymentTerms,
				currency: updateData.currency,
				status: updateData.status ? statusMapping[updateData.status] || "ACTIVE" : undefined,
				...addressFields,
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
		const { page, limit, search, companyId, status, sortBy, sortOrder } =
			validatedQuery;

		const skip = (page - 1) * limit;
		
		// Build where clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {};

		// Filter by company ID if provided
		if (companyId) where.companyId = companyId;

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ code: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
			];
		}

		// Map status to valid enum values
		if (status) {
			const statusMapping: Record<string, "ACTIVE" | "INACTIVE" | "SUSPENDED"> = {
				ACTIVE: "ACTIVE",
				INACTIVE: "INACTIVE",
				SUSPENDED: "SUSPENDED",
				PENDING_APPROVAL: "INACTIVE",
				BLACKLISTED: "SUSPENDED",
			};
			where.status = statusMapping[status] || status;
		}

		// Build order clause (removed rating - doesn't exist on Supplier)
		const orderBy: {
			name?: "asc" | "desc";
			code?: "asc" | "desc";
			createdAt?: "asc" | "desc";
			updatedAt?: "asc" | "desc";
		} = {};
		if (sortBy === "name") {
			orderBy.name = sortOrder;
		} else if (sortBy === "code") {
			orderBy.code = sortOrder;
		} else if (sortBy === "createdAt") {
			orderBy.createdAt = sortOrder;
		} else if (sortBy === "updatedAt") {
			orderBy.updatedAt = sortOrder;
		} else {
			// Default sort
			orderBy.createdAt = sortOrder;
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
			data: {
				productId: validatedData.productId,
				supplierId: validatedData.supplierId,
				supplierSku: validatedData.supplierSku,
				unitCost: validatedData.unitCost,
				leadTimeDays: validatedData.leadTimeDays,
				isPreferred: validatedData.isPreferred || false,
			},
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
			data: {
				supplierSku: updateData.supplierSku,
				unitCost: updateData.unitCost,
				leadTimeDays: updateData.leadTimeDays,
				isPreferred: updateData.isPreferred,
			},
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
