"use server";

import { neonClient } from "@/lib/prisma";
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

		// Generate slug for category lookup if needed
		const slug = validatedData.slug || validatedData.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		// Prepare the data for Prisma creation
		const { categoryId, brandId, categoryName, dimensions, weight, ...productData } = validatedData;

		// AUTO-CREATE CATEGORY: If categoryName is provided, create/find the category
		let finalCategoryId = categoryId || null;

		if (categoryName && slug) {
			console.log("🏷️ Auto-creating category from product data...");

			// Check if category with this slug already exists for this company
			const existingCategory = await neonClient.category.findFirst({
				where: { 
					slug: slug,
					companyId: productData.companyId,
				},
			});

			if (existingCategory) {
				console.log("✅ Category already exists:", existingCategory.id);
				finalCategoryId = existingCategory.id;
			} else {
				// Create new category from product data
				const newCategory = await neonClient.category.create({
					data: {
						name: categoryName,
						description: validatedData.description || null,
						slug: slug,
						companyId: productData.companyId,
						parentId: null,
						displayOrder: 0,
						isActive: true,
					},
				});

				console.log("✅ Created new category:", newCategory.id);
				finalCategoryId = newCategory.id;
			}
		}

		const product = await neonClient.product.create({
			data: {
				name: productData.name,
				description: productData.description,
				sku: productData.sku,
				barcode: productData.barcode,
				categoryId: finalCategoryId,
				brandId: brandId || null,
				// Dimensions - use structured fields (not JSON)
				weightKg: weight ? weight : undefined,
				lengthCm: dimensions?.length ? dimensions.length : undefined,
				widthCm: dimensions?.width ? dimensions.width : undefined,
				heightCm: dimensions?.height ? dimensions.height : undefined,
				// Pricing
				costPrice: productData.costPrice,
				sellingPrice: productData.sellingPrice,
				wholesalePrice: productData.wholesalePrice,
				// Inventory config
				minStock: productData.minStockLevel || 10,
				reorderPoint: productData.reorderPoint || 50,
				// Status
				status: productData.status || "ACTIVE",
				isTrackable: productData.isTrackable ?? true,
				isSerialized: productData.isSerialized ?? false,
				// Audit
				createdById: productData.createdBy,
				companyId: productData.companyId,
			},
			include: {
				category: true,
				brand: true,
				variants: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
			},
		});

		// Create primary image if provided
		if (productData.primaryImage) {
			await neonClient.productImage.create({
				data: {
					productId: product.id,
					url: productData.primaryImage,
					isPrimary: true,
					order: 0,
				},
			});
		}

		// Create additional images if provided
		if (productData.images && productData.images.length > 0) {
			const imageData = productData.images
				.filter(url => url !== productData.primaryImage) // Don't duplicate primary
				.map((url, index) => ({
					productId: product.id,
					url,
					isPrimary: false,
					order: index + 1,
				}));
			
			if (imageData.length > 0) {
				await neonClient.productImage.createMany({
					data: imageData,
				});
			}
		}

		// Create tags if provided
		if (productData.tags && productData.tags.length > 0) {
			for (const tagName of productData.tags) {
				const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
				
				// Find or create tag
				let tag = await neonClient.tag.findFirst({
					where: { 
						slug: tagSlug,
						companyId: productData.companyId,
					},
				});

				if (!tag) {
					tag = await neonClient.tag.create({
						data: {
							name: tagName,
							slug: tagSlug,
							companyId: productData.companyId,
						},
					});
				}

				// Create product-tag relation
				await neonClient.productTag.create({
					data: {
						productId: product.id,
						tagId: tag.id,
					},
				});
			}
		}

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
		const { id, dimensions, weight, ...updateData } = validatedData;

		// Check if product exists
		const existingProduct = await neonClient.product.findUnique({
			where: { id },
		});

		if (!existingProduct) {
			return actionError("Product not found");
		}

		// Build update data with proper field mappings
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const prismaUpdateData: any = {
			name: updateData.name,
			description: updateData.description,
			sku: updateData.sku,
			barcode: updateData.barcode,
			categoryId: updateData.categoryId,
			brandId: updateData.brandId,
			costPrice: updateData.costPrice,
			sellingPrice: updateData.sellingPrice,
			wholesalePrice: updateData.wholesalePrice,
			minStock: updateData.minStockLevel,
			reorderPoint: updateData.reorderPoint,
			status: updateData.status,
			isTrackable: updateData.isTrackable,
			isSerialized: updateData.isSerialized,
		};

		// Handle dimensions
		if (weight !== undefined) {
			prismaUpdateData.weightKg = weight;
		}
		if (dimensions) {
			if (dimensions.length !== undefined) prismaUpdateData.lengthCm = dimensions.length;
			if (dimensions.width !== undefined) prismaUpdateData.widthCm = dimensions.width;
			if (dimensions.height !== undefined) prismaUpdateData.heightCm = dimensions.height;
		}

		// Remove undefined values
		Object.keys(prismaUpdateData).forEach(key => {
			if (prismaUpdateData[key] === undefined) {
				delete prismaUpdateData[key];
			}
		});

		const product = await neonClient.product.update({
			where: { id },
			data: prismaUpdateData,
			include: {
				category: true,
				brand: true,
				variants: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
				images: true,
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

		console.log("🔍 getProducts: Query params:", { page, limit, skip, search, categoryId, brandId, status });
		
		// Build where clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {};

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
		if (status) where.status = status;

		// Build order clause
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const orderBy: any = {};
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
					category: {
						select: { id: true, name: true, slug: true },
					},
					brand: {
						select: { id: true, name: true, slug: true },
					},
					variants: {
						select: {
							id: true,
							name: true,
							sku: true,
							isActive: true,
						},
					},
					inventoryItems: {
						select: {
							quantity: true,
							reservedQuantity: true,
							warehouse: {
								select: { id: true, name: true, code: true },
							},
						},
					},
					images: {
						where: { isPrimary: true },
						take: 1,
						select: { url: true },
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

		// Calculate aggregated stock values for each product
		const products = rawProducts.map(product => {
			const totalStock = product.inventoryItems.reduce(
				(sum: number, item: { quantity: number }) => sum + (item.quantity || 0),
				0
			);
			// availableQuantity is computed: quantity - reservedQuantity
			const availableStock = product.inventoryItems.reduce(
				(sum: number, item: { quantity: number; reservedQuantity: number }) => 
					sum + ((item.quantity || 0) - (item.reservedQuantity || 0)),
				0
			);
			const reservedStock = product.inventoryItems.reduce(
				(sum: number, item: { reservedQuantity: number }) => sum + (item.reservedQuantity || 0),
				0
			);

			// Get primary image URL
			const primaryImage = product.images.length > 0 ? product.images[0].url : null;

			return {
				...product,
				// Convert Decimal types to numbers for frontend
				costPrice: product.costPrice ? Number(product.costPrice) : undefined,
				sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : undefined,
				wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : undefined,
				weightKg: product.weightKg ? Number(product.weightKg) : undefined,
				// Stock calculations
				totalStock,
				availableStock,
				reservedStock,
				// Primary image for compatibility
				primaryImage,
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
				category: true,
				brand: true,
				variants: {
					include: {
						attributes: true,
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
						movements: {
							orderBy: { occurredAt: "desc" },
							take: 10,
						},
					},
				},
				images: {
					orderBy: { order: "asc" },
				},
				tags: {
					include: {
						tag: true,
					},
				},
				supplierProducts: {
					include: {
						supplier: true,
					},
				},
			},
		});

		if (!product) {
			return actionError("Product not found");
		}

		// Transform for frontend compatibility
		const transformedProduct = {
			...product,
			// Get primary image
			primaryImage: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url || null,
			// Convert dimensions
			weight: product.weightKg ? Number(product.weightKg) : null,
			dimensions: (product.lengthCm || product.widthCm || product.heightCm) ? {
				length: product.lengthCm ? Number(product.lengthCm) : null,
				width: product.widthCm ? Number(product.widthCm) : null,
				height: product.heightCm ? Number(product.heightCm) : null,
				unit: "cm",
			} : null,
			// Alias for compatibility
			suppliers: product.supplierProducts,
		};

		return actionSuccess(transformedProduct, "Product retrieved successfully");
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

		// Create variant
		const variant = await neonClient.productVariant.create({
			data: {
				productId: validatedData.productId,
				name: validatedData.name,
				sku: validatedData.sku,
				barcode: validatedData.barcode,
				costPrice: validatedData.costPrice,
				sellingPrice: validatedData.sellingPrice,
				isActive: validatedData.isActive ?? true,
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

		// Create variant attributes from the attributes object
		if (validatedData.attributes && typeof validatedData.attributes === 'object') {
			const attributeData = Object.entries(validatedData.attributes).map(([name, value]) => ({
				variantId: variant.id,
				name,
				value: String(value),
			}));

			if (attributeData.length > 0) {
				await neonClient.variantAttribute.createMany({
					data: attributeData,
				});
			}
		}

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
		const { id, attributes, ...updateData } = validatedData;

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
				name: updateData.name,
				sku: updateData.sku,
				barcode: updateData.barcode,
				costPrice: updateData.costPrice,
				sellingPrice: updateData.sellingPrice,
				isActive: updateData.isActive,
			},
			include: {
				product: true,
				attributes: true,
				inventoryItems: {
					include: {
						warehouse: true,
					},
				},
			},
		});

		// Update attributes if provided
		if (attributes && typeof attributes === 'object') {
			// Delete existing attributes
			await neonClient.variantAttribute.deleteMany({
				where: { variantId: id },
			});

			// Create new attributes
			const attributeData = Object.entries(attributes).map(([name, value]) => ({
				variantId: id,
				name,
				value: String(value),
			}));

			if (attributeData.length > 0) {
				await neonClient.variantAttribute.createMany({
					data: attributeData,
				});
			}
		}

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

		// Build update data with proper field mappings
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const prismaUpdateData: any = {};

		if (updates.name !== undefined) prismaUpdateData.name = updates.name;
		if (updates.description !== undefined) prismaUpdateData.description = updates.description;
		if (updates.sku !== undefined) prismaUpdateData.sku = updates.sku;
		if (updates.barcode !== undefined) prismaUpdateData.barcode = updates.barcode;
		if (updates.categoryId !== undefined) prismaUpdateData.categoryId = updates.categoryId;
		if (updates.brandId !== undefined) prismaUpdateData.brandId = updates.brandId;
		if (updates.costPrice !== undefined) prismaUpdateData.costPrice = updates.costPrice;
		if (updates.sellingPrice !== undefined) prismaUpdateData.sellingPrice = updates.sellingPrice;
		if (updates.wholesalePrice !== undefined) prismaUpdateData.wholesalePrice = updates.wholesalePrice;
		if (updates.status !== undefined) prismaUpdateData.status = updates.status;
		if (updates.isTrackable !== undefined) prismaUpdateData.isTrackable = updates.isTrackable;
		if (updates.isSerialized !== undefined) prismaUpdateData.isSerialized = updates.isSerialized;
		if (updates.minStockLevel !== undefined) prismaUpdateData.minStock = updates.minStockLevel;
		if (updates.reorderPoint !== undefined) prismaUpdateData.reorderPoint = updates.reorderPoint;
		if (updates.weight !== undefined) prismaUpdateData.weightKg = updates.weight;
		if (updates.dimensions) {
			if (updates.dimensions.length !== undefined) prismaUpdateData.lengthCm = updates.dimensions.length;
			if (updates.dimensions.width !== undefined) prismaUpdateData.widthCm = updates.dimensions.width;
			if (updates.dimensions.height !== undefined) prismaUpdateData.heightCm = updates.dimensions.height;
		}

		const updatedProducts = await neonClient.product.updateMany({
			where: { id: { in: productIds } },
			data: prismaUpdateData,
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
