"use server";

import { neonClient } from "@/lib/db";
import {
	createProductSchema,
	updateProductSchema,
	productQuerySchema,
	createProductVariantSchema,
	updateProductVariantSchema,
	bulkProductUpdateSchema,
	bulkProductDeleteSchema,
	type CreateProductInput,
	type UpdateProductInput,
	type ProductQueryInput,
	type CreateProductVariantInput,
	type UpdateProductVariantInput,
	type BulkProductUpdateInput,
	type BulkProductDeleteInput,
} from "@/lib/validations/product";
import {
	actionSuccess,
	actionError,
	type ActionResponse,
} from "@/lib/api-utils";
import { revalidatePath } from "next/cache";

// Create a new product
export async function createProduct(
	input: CreateProductInput,
): Promise<ActionResponse> {
	try {
		console.log(
			"createProduct: received input:",
			JSON.stringify(input, null, 2),
		);

		const validatedData = createProductSchema.parse(input);
		console.log(
			"createProduct: validation passed, validated data:",
			JSON.stringify(validatedData, null, 2),
		);

		// Generate slug if not provided
		if (!validatedData.slug) {
			validatedData.slug = validatedData.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
		}		// Prepare the data for Prisma creation
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { categoryId, brandId, categoryName: _categoryName, brandName: _brandName, ...productData } =
			validatedData;

		// Create the base data object
		const createData = {
			name: productData.name,
			description: productData.description,
			sku: productData.sku,
			barcode: productData.barcode,
			slug: productData.slug,
			categoryName: validatedData.categoryName,
			brandName: validatedData.brandName,
			// Include categoryId and brandId directly in Product table
			categoryId: categoryId || null,
			brandId: brandId || null,
			weight: productData.weight,
			dimensions: productData.dimensions || undefined,
			color: productData.color,
			size: productData.size,
			material: productData.material,
			costPrice: productData.costPrice,
			sellingPrice: productData.sellingPrice,
			wholesalePrice: productData.wholesalePrice,
			minStockLevel: productData.minStockLevel,
			maxStockLevel: productData.maxStockLevel,
			reorderPoint: productData.reorderPoint,
			reorderQuantity: productData.reorderQuantity,
			status: productData.status,
			isTrackable: productData.isTrackable,
			isSerialized: productData.isSerialized,
			images: productData.images || undefined,
			primaryImage: productData.primaryImage,
			metaTitle: productData.metaTitle,
			metaDescription: productData.metaDescription,
			tags: productData.tags || undefined,
			leadTimeSupply: productData.leadTimeSupply,
			shelfLife: productData.shelfLife,
			createdBy: productData.createdBy,
			companyId: productData.companyId, // Now passed from API route
		};

		console.log(
			"createProduct: prepared data for Prisma:",
			JSON.stringify(createData, null, 2),
		);

		const product = await neonClient.product.create({
			data: createData,
			include: {
				variants: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
			},
		});

		console.log("createProduct: product created successfully:", product.id);
		revalidatePath("/inventory/products");
		return actionSuccess(product, "Product created successfully");
	} catch (error) {
		console.error("Error creating product - Full error details:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
		return actionError(
			`Failed to create product: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Update an existing product
export async function updateProduct(
	input: UpdateProductInput,
): Promise<ActionResponse> {
	try {
		const validatedData = updateProductSchema.parse(input);
		const { id, ...updateData } = validatedData;

		// Check if product exists
		const existingProduct = await neonClient.product.findUnique({
			where: { id },
		});

		if (!existingProduct) {
			return actionError("Product not found");
		}

		// Update slug if name changed
		if (updateData.name && !updateData.slug) {
			updateData.slug = updateData.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
		}

		const product = await neonClient.product.update({
			where: { id },
			data: {
				...updateData,
				dimensions: updateData.dimensions || undefined,
				images: updateData.images || undefined,
				tags: updateData.tags || undefined,
			},
			include: {
				variants: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
			},
		});

		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${id}`);
		return actionSuccess(product, "Product updated successfully");
	} catch (error) {
		console.error("Error updating product:", error);
		return actionError("Failed to update product");
	}
}

// Delete a product
export async function deleteProduct(id: string): Promise<ActionResponse> {
	try {
		// Check if product exists
		const existingProduct = await neonClient.product.findUnique({
			where: { id },
			include: {
				inventoryItems: true,
				variants: true,
				orderItems: true,
				purchaseItems: true,
			},
		});

		if (!existingProduct) {
			return actionError("Product not found");
		}

		// Check if product has inventory or is referenced in orders
		if (existingProduct.inventoryItems.length > 0) {
			return actionError("Cannot delete product with existing inventory");
		}

		if (
			existingProduct.orderItems.length > 0 ||
			existingProduct.purchaseItems.length > 0
		) {
			return actionError(
				"Cannot delete product that has been ordered or purchased",
			);
		}

		await neonClient.product.delete({
			where: { id },
		});

		revalidatePath("/inventory/products");
		return actionSuccess(null, "Product deleted successfully");
	} catch (error) {
		console.error("Error deleting product:", error);
		return actionError("Failed to delete product");
	}
}

// Get products with filtering and pagination
export async function getProducts(
	input: ProductQueryInput,
): Promise<ActionResponse> {
	try {
		console.log("🔍 getProducts: Starting with input:", input);

		const validatedQuery = productQuerySchema.parse(input);
		const {
			page,
			limit,
			search,
			categoryId,
			brandId,
			status,
			sortBy,
			sortOrder,
		} = validatedQuery;

		const skip = (page - 1) * limit;

		console.log("🔍 getProducts: Query params:", { page, limit, skip, search, categoryId, brandId, status }); // Build where clause
		const where: Record<string, unknown> = {};

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: "insensitive" } },
				{ sku: { contains: search, mode: "insensitive" } },
				{ barcode: { contains: search, mode: "insensitive" } },
				{ description: { contains: search, mode: "insensitive" } },
			];
		}

		if (categoryId) where.categoryId = categoryId;
		if (brandId) where.brandId = brandId;
		if (status) where.status = status; // Build order clause
		const orderBy: Record<string, unknown> = {};
		if (sortBy === "name") {
			orderBy.name = sortOrder;
		} else if (sortBy === "sku") {
			orderBy.sku = sortOrder;
		} else if (sortBy === "createdAt") {
			orderBy.createdAt = sortOrder;
		} else if (sortBy === "updatedAt") {
			orderBy.updatedAt = sortOrder;
		}

		console.log("🔍 getProducts: Querying database with where:", where);

		const [rawProducts, total] = await Promise.all([
			neonClient.product.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					variants: {
						select: {
							id: true,
							name: true,
							sku: true,
							attributes: true,
							isActive: true,
						},
					},
					inventoryItems: {
						select: {
							quantity: true,
							availableQuantity: true,
							reservedQuantity: true,
							warehouse: {
								select: { id: true, name: true, code: true },
							},
						},
					},
				},
			}),
			neonClient.product.count({ where }),
		]);

		console.log("🔍 getProducts: Database returned:", {
			rawProductsCount: rawProducts.length,
			total,
			firstProduct: rawProducts[0] ? { id: rawProducts[0].id, name: rawProducts[0].name } : null
		});

		// Calculate aggregated stock values and add category/brand objects for each product
		const products = rawProducts.map(product => {
			const totalStock = product.inventoryItems.reduce(
				(sum, item) => sum + (item.quantity || 0),
				0
			);
			const availableStock = product.inventoryItems.reduce(
				(sum, item) => sum + (item.availableQuantity || 0),
				0
			);
			const reservedStock = product.inventoryItems.reduce(
				(sum, item) => sum + (item.reservedQuantity || 0),
				0
			);

			return {
				...product,
				// Convert Decimal types to numbers for frontend
				costPrice: product.costPrice ? Number(product.costPrice) : undefined,
				sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : undefined,
				wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : undefined,
				weight: product.weight ? Number(product.weight) : undefined,
				totalStock,
				availableStock,
				reservedStock,
				// Add category and brand objects for frontend compatibility
				category: product.categoryId && product.categoryName ? {
					id: product.categoryId,
					name: product.categoryName,
				} : undefined,
				brand: product.brandId && product.brandName ? {
					id: product.brandId,
					name: product.brandName,
				} : undefined,
			};
		});

		const pagination = {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		};

		console.log("✅ getProducts: Returning", products.length, "products with pagination:", pagination);

		return actionSuccess(
			{ products, pagination },
			"Products retrieved successfully",
		);
	} catch (error) {
		console.error("Error fetching products:", error);
		return actionError("Failed to fetch products");
	}
}

// Get a single product by ID
export async function getProduct(id: string): Promise<ActionResponse> {
	try {
		const product = await neonClient.product.findUnique({
			where: { id },
			include: {
				variants: {
					include: {
						inventoryItems: {
							include: {
								warehouse: true,
							},
						},
					},
				},
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
				suppliers: {
					include: {
						supplier: true,
					},
				},
				movements: {
					orderBy: { occurredAt: "desc" },
					take: 10,
					include: {
						warehouse: true,
					},
				},
			},
		});

		if (!product) {
			return actionError("Product not found");
		}

		return actionSuccess(product, "Product retrieved successfully");
	} catch (error) {
		console.error("Error fetching product:", error);
		return actionError("Failed to fetch product");
	}
}

// Create a product variant
export async function createProductVariant(
	input: CreateProductVariantInput,
): Promise<ActionResponse> {
	try {
		const validatedData = createProductVariantSchema.parse(input);

		// Check if parent product exists
		const parentProduct = await neonClient.product.findUnique({
			where: { id: validatedData.productId },
		});

		if (!parentProduct) {
			return actionError("Parent product not found");
		}
		const variant = await neonClient.productVariant.create({
			data: {
				...validatedData,
				attributes: validatedData.attributes,
			},
			include: {
				product: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
			},
		});

		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${validatedData.productId}`);
		return actionSuccess(variant, "Product variant created successfully");
	} catch (error) {
		console.error("Error creating product variant:", error);
		return actionError("Failed to create product variant");
	}
}

// Update a product variant
export async function updateProductVariant(
	input: UpdateProductVariantInput,
): Promise<ActionResponse> {
	try {
		const validatedData = updateProductVariantSchema.parse(input);
		const { id, ...updateData } = validatedData;

		// Check if variant exists
		const existingVariant = await neonClient.productVariant.findUnique({
			where: { id },
			include: { product: true },
		});

		if (!existingVariant) {
			return actionError("Product variant not found");
		}
		const variant = await neonClient.productVariant.update({
			where: { id },
			data: {
				...updateData,
				attributes: updateData.attributes || undefined,
			},
			include: {
				product: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
			},
		});

		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${existingVariant.productId}`);
		return actionSuccess(variant, "Product variant updated successfully");
	} catch (error) {
		console.error("Error updating product variant:", error);
		return actionError("Failed to update product variant");
	}
}

// Delete a product variant
export async function deleteProductVariant(
	id: string,
): Promise<ActionResponse> {
	try {
		// Check if variant exists and get product ID
		const existingVariant = await neonClient.productVariant.findUnique({
			where: { id },
			include: {
				inventoryItems: true,
				orderItems: true,
				purchaseItems: true,
			},
		});

		if (!existingVariant) {
			return actionError("Product variant not found");
		}

		// Check if variant has inventory or is referenced in orders
		if (existingVariant.inventoryItems.length > 0) {
			return actionError("Cannot delete variant with existing inventory");
		}

		if (
			existingVariant.orderItems.length > 0 ||
			existingVariant.purchaseItems.length > 0
		) {
			return actionError(
				"Cannot delete variant that has been ordered or purchased",
			);
		}

		const productId = existingVariant.productId;

		await neonClient.productVariant.delete({
			where: { id },
		});

		revalidatePath("/inventory/products");
		revalidatePath(`/inventory/products/${productId}`);
		return actionSuccess(null, "Product variant deleted successfully");
	} catch (error) {
		console.error("Error deleting product variant:", error);
		return actionError("Failed to delete product variant");
	}
}

// Bulk update products
export async function bulkUpdateProducts(
	input: BulkProductUpdateInput,
): Promise<ActionResponse> {
	try {
		const validatedData = bulkProductUpdateSchema.parse(input);
		const { productIds, updates } = validatedData;

		// Check if all products exist
		const existingProducts = await neonClient.product.findMany({
			where: { id: { in: productIds } },
			select: { id: true },
		});

		if (existingProducts.length !== productIds.length) {
			return actionError("One or more products not found");
		}
		const updatedProducts = await neonClient.product.updateMany({
			where: { id: { in: productIds } },
			data: {
				...updates,
				dimensions: updates.dimensions || undefined,
				images: updates.images || undefined,
				tags: updates.tags || undefined,
			},
		});

		revalidatePath("/inventory/products");
		return actionSuccess(
			{ count: updatedProducts.count },
			`${updatedProducts.count} products updated successfully`,
		);
	} catch (error) {
		console.error("Error bulk updating products:", error);
		return actionError("Failed to bulk update products");
	}
}

// Bulk delete products
export async function bulkDeleteProducts(
	input: BulkProductDeleteInput,
): Promise<ActionResponse> {
	try {
		const validatedData = bulkProductDeleteSchema.parse(input);
		const { productIds } = validatedData;

		// Check if products can be deleted
		const products = await neonClient.product.findMany({
			where: { id: { in: productIds } },
			include: {
				inventoryItems: true,
				orderItems: true,
				purchaseItems: true,
			},
		});

		const undeletableProducts = products.filter(
			(product) =>
				product.inventoryItems.length > 0 ||
				product.orderItems.length > 0 ||
				product.purchaseItems.length > 0,
		);

		if (undeletableProducts.length > 0) {
			return actionError(
				`Cannot delete ${undeletableProducts.length} product(s) with existing inventory or order history`,
			);
		}

		const deletedProducts = await neonClient.product.deleteMany({
			where: { id: { in: productIds } },
		});

		revalidatePath("/inventory/products");
		return actionSuccess(
			{ count: deletedProducts.count },
			`${deletedProducts.count} products deleted successfully`,
		);
	} catch (error) {
		console.error("Error bulk deleting products:", error);
		return actionError("Failed to bulk delete products");
	}
}
