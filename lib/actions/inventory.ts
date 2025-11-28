"use server";

import { neonClient } from "@/lib/prisma";
import {
	inventoryItemSchema,
	updateInventoryItemSchema,
	stockMovementSchema,
	stockAdjustmentSchema,
	stockTransferSchema,
	stockReservationSchema,
	inventoryQuerySchema,
	movementQuerySchema,
	type InventoryItemInput,
	type UpdateInventoryItemInput,
	type StockMovementInput,
	type StockAdjustmentInput,
	type StockTransferInput,
	type StockReservationInput,
	type InventoryQueryInput,
	type MovementQueryInput,
} from "@/lib/validations/inventory";
import {
	actionSuccess,
	actionError,
	type ActionResponse,
} from "@/lib/api-utils";
import { revalidatePath } from "next/cache";

// Create inventory item
export async function createInventoryItem(
	input: InventoryItemInput,
): Promise<ActionResponse> {
	try {
		const validatedData = inventoryItemSchema.parse(input);

		// Validate references exist
		const [product, variant, warehouse] = await Promise.all([
			neonClient.product.findUnique({ where: { id: validatedData.productId } }),
			validatedData.variantId
				? neonClient.productVariant.findUnique({
						where: { id: validatedData.variantId },
					})
				: null,
			neonClient.warehouse.findUnique({
				where: { id: validatedData.warehouseId },
			}),
		]);

		if (!product) return actionError("Product not found");
		if (validatedData.variantId && !variant)
			return actionError("Product variant not found");
		if (!warehouse) return actionError("Warehouse not found");

		// Calculate available quantity
		const availableQuantity =
			validatedData.quantity - validatedData.reservedQuantity;

		const inventoryItem = await neonClient.inventoryItem.create({
			data: {
				...validatedData,
				status: validatedData.status === "RECALLED" ? "DAMAGED" : validatedData.status, // Map RECALLED to DAMAGED or valid enum
				serialNumbers: validatedData.serialNumbers,
			},
			include: {
				product: { select: { id: true, name: true, sku: true } },
				variant: { select: { id: true, name: true, sku: true } },
				warehouse: { select: { id: true, name: true, code: true } },
			},
		});

		revalidatePath("/inventory/stock");
		return actionSuccess(inventoryItem, "Inventory item created successfully");
	} catch (error) {
		console.error("Error creating inventory item:", error);
		return actionError("Failed to create inventory item");
	}
}

// Update inventory item
export async function updateInventoryItem(
	input: UpdateInventoryItemInput,
): Promise<ActionResponse> {
	try {
		const validatedData = updateInventoryItemSchema.parse(input);
		const { id, ...updateData } = validatedData;

		const existingItem = await neonClient.inventoryItem.findUnique({
			where: { id },
		});

		if (!existingItem) {
			return actionError("Inventory item not found");
		}

		// Calculate available quantity if quantity or reserved quantity changed
		const availableQuantity =
			updateData.quantity !== undefined ||
			updateData.reservedQuantity !== undefined
				? (updateData.quantity ?? existingItem.quantity) -
					(updateData.reservedQuantity ?? existingItem.reservedQuantity)
				: undefined;

		const inventoryItem = await neonClient.inventoryItem.update({
			where: { id },
			data: {
				...updateData,
				// productId: updateData.productId, // Removed
				status: updateData.status === "RECALLED" ? "DAMAGED" : updateData.status,
				serialNumbers: updateData.serialNumbers,
			},
			include: {
				product: { select: { id: true, name: true, sku: true } },
				variant: { select: { id: true, name: true, sku: true } },
				warehouse: { select: { id: true, name: true, code: true } },
			},
		});

		revalidatePath("/inventory/stock");
		return actionSuccess(inventoryItem, "Inventory item updated successfully");
	} catch (error) {
		console.error("Error updating inventory item:", error);
		return actionError("Failed to update inventory item");
	}
}

// Create stock movement and update inventory
export async function createStockMovement(
	input: StockMovementInput,
): Promise<ActionResponse> {
	try {
		const validatedData = stockMovementSchema.parse(input);

		// Validate references exist
		const [product, variant, warehouse] = await Promise.all([
			neonClient.product.findUnique({ where: { id: validatedData.productId } }),
			validatedData.variantId
				? neonClient.productVariant.findUnique({
						where: { id: validatedData.variantId },
					})
				: null,
			neonClient.warehouse.findUnique({
				where: { id: validatedData.warehouseId },
			}),
		]);

		if (!product) return actionError("Product not found");
		if (validatedData.variantId && !variant)
			return actionError("Product variant not found");
		if (!warehouse) return actionError("Warehouse not found");

		// Find or create inventory item
		let inventoryItem = await neonClient.inventoryItem.findFirst({
			where: {
				productId: validatedData.productId,
				variantId: validatedData.variantId,
				warehouseId: validatedData.warehouseId,
				lotNumber: validatedData.lotNumber,
			},
		});

		const quantityBefore = inventoryItem?.quantity || 0;
		let quantityAfter = quantityBefore;

		// Calculate quantity change based on movement type
		if (["RECEIPT", "TRANSFER_IN", "RETURN"].includes(validatedData.type)) {
			quantityAfter = quantityBefore + validatedData.quantity;
		} else if (
			["SHIPMENT", "TRANSFER_OUT", "DAMAGE", "EXPIRED", "THEFT"].includes(
				validatedData.type,
			)
		) {
			quantityAfter = quantityBefore - validatedData.quantity;
			if (quantityAfter < 0) {
				return actionError("Insufficient stock for this movement");
			}
		} else if (validatedData.type === "ADJUSTMENT") {
			quantityAfter = validatedData.quantity; // Direct set for adjustments
		}

		// Use transaction to ensure consistency
		const result = await neonClient.$transaction(async (tx) => {
			let targetInventoryItem = inventoryItem;

			// Create or update inventory item first
			if (targetInventoryItem) {
				targetInventoryItem = await tx.inventoryItem.update({
					where: { id: targetInventoryItem.id },
					data: {
						quantity: quantityAfter,
					},
					include: {
						product: { select: { id: true, name: true, sku: true } },
						variant: { select: { id: true, name: true, sku: true } },
						warehouse: { select: { id: true, name: true, code: true } },
					},
				});
			} else {
				targetInventoryItem = await tx.inventoryItem.create({
					data: {
						productId: validatedData.productId,
						variantId: validatedData.variantId,
						warehouseId: validatedData.warehouseId,
						quantity: quantityAfter,
						reservedQuantity: 0,
						lotNumber: validatedData.lotNumber,
						batchNumber: validatedData.batchNumber,
						expiryDate: validatedData.expiryDate,
					},
					include: {
						product: { select: { id: true, name: true, sku: true } },
						variant: { select: { id: true, name: true, sku: true } },
						warehouse: { select: { id: true, name: true, code: true } },
					},
				});
			}

			// Create movement record linked to the item
			const movement = await tx.inventoryMovement.create({
				data: {
					type: validatedData.type as any,
					quantity: validatedData.quantity,
					quantityBefore,
					quantityAfter,
					inventoryItemId: targetInventoryItem.id,
					reason: validatedData.reason,
					notes: validatedData.notes,
					createdById: validatedData.userId,
					occurredAt: validatedData.occurredAt,
				},
				include: {
					inventoryItem: {
						include: {
							product: { select: { id: true, name: true, sku: true } },
							variant: { select: { id: true, name: true, sku: true } },
							warehouse: { select: { id: true, name: true, code: true } },
						},
					},
				},
			});

			return { movement, inventoryItem: targetInventoryItem };
		});

		revalidatePath("/inventory/stock");
		revalidatePath("/inventory/movements");
		return actionSuccess(result, "Stock movement created successfully");
	} catch (error) {
		console.error("Error creating stock movement:", error);
		return actionError("Failed to create stock movement");
	}
}

// Stock adjustment with approval flow
export async function adjustStock(
	input: StockAdjustmentInput,
): Promise<ActionResponse> {
	try {
		const validatedData = stockAdjustmentSchema.parse(input);

		// Find inventory item
		const inventoryItem = await neonClient.inventoryItem.findFirst({
			where: {
				productId: validatedData.productId,
				variantId: validatedData.variantId,
				warehouseId: validatedData.warehouseId,
			},
		});

		if (!inventoryItem) {
			return actionError("Inventory item not found");
		}

		const currentQuantity = inventoryItem.quantity;
		let newQuantity: number;

		switch (validatedData.adjustmentType) {
			case "INCREASE":
				newQuantity = currentQuantity + validatedData.quantity;
				break;
			case "DECREASE":
				newQuantity = Math.max(0, currentQuantity - validatedData.quantity);
				break;
			case "SET":
				newQuantity = validatedData.quantity;
				break;
			default:
				return actionError("Invalid adjustment type");
		}

		// Create stock movement
		const movementInput: StockMovementInput = {
			type: "ADJUSTMENT",
			inventoryItemId: inventoryItem.id,
			productId: inventoryItem.productId,
			warehouseId: inventoryItem.warehouseId,
			quantity: newQuantity,
			reason: validatedData.reason,
			notes: validatedData.notes,
			userId: validatedData.userId,
			approvedBy: validatedData.approvedBy,
			approvedAt: validatedData.approvedBy ? new Date() : undefined,
			occurredAt: new Date(),
		};

		return await createStockMovement(movementInput);
	} catch (error) {
		console.error("Error adjusting stock:", error);
		return actionError("Failed to adjust stock");
	}
}

// Stock transfer between warehouses
export async function transferStock(
	input: StockTransferInput,
): Promise<ActionResponse> {
	return actionError("Not implemented");
}

// Get inventory with filtering and pagination
export async function getInventory(
	input: InventoryQueryInput,
): Promise<ActionResponse> {
	try {
		const validatedQuery = inventoryQuerySchema.parse(input);
		const {
			page,
			limit,
			search,
			warehouseId,
			productId,
			categoryId,
			brandId,
			status,
			lowStock,
			sortBy,
			sortOrder,
		} = validatedQuery;

		const skip = (page - 1) * limit;
		const where: any = {};

		if (search) {
			where.OR = [
				{ product: { name: { contains: search, mode: "insensitive" } } },
				{ product: { sku: { contains: search, mode: "insensitive" } } },
				{ lotNumber: { contains: search, mode: "insensitive" } },
			];
		}

		if (warehouseId) where.warehouseId = warehouseId;
		if (productId) where.productId = productId;
		if (categoryId) where.product = { categoryId };
		if (brandId) where.product = { brandId };
		if (status) where.status = status;

		const orderBy: any = {};
		if (sortBy === "quantity") {
			orderBy.quantity = sortOrder;
		} else if (sortBy === "createdAt") {
			orderBy.createdAt = sortOrder;
		}

		const [inventory, total] = await Promise.all([
			neonClient.inventoryItem.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					product: {
						select: {
							id: true,
							name: true,
							sku: true,
							minStock: true,
							reorderPoint: true,
						},
					},
					variant: {
						select: { id: true, name: true, sku: true },
					},
					warehouse: {
						select: { id: true, name: true, code: true },
					},
				},
			}),
			neonClient.inventoryItem.count({ where }),
		]);

		const pagination = {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		};

		return actionSuccess(
			{ inventory, pagination },
			"Inventory retrieved successfully",
		);
	} catch (error) {
		console.error("Error fetching inventory:", error);
		return actionError("Failed to fetch inventory");
	}
}

// Get stock movements with filtering
export async function getStockMovements(
	input: MovementQueryInput,
): Promise<ActionResponse> {
	try {
		const validatedQuery = movementQuerySchema.parse(input);
		const {
			page,
			limit,
			productId,
			warehouseId,
			type,
			dateFrom,
			dateTo,
			sortBy,
			sortOrder,
		} = validatedQuery;

		const skip = (page - 1) * limit;
		const where: any = {};

		if (productId) where.productId = productId;
		if (warehouseId) where.warehouseId = warehouseId;
		if (type) where.type = type;

		if (dateFrom || dateTo) {
			where.occurredAt = {};
			if (dateFrom) where.occurredAt.gte = dateFrom;
			if (dateTo) where.occurredAt.lte = dateTo;
		}

		const orderBy: any = {};
		if (sortBy === "occurredAt") {
			orderBy.occurredAt = sortOrder;
		}

		const [movements, total] = await Promise.all([
			neonClient.inventoryMovement.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					inventoryItem: {
						include: {
							product: {
								select: { id: true, name: true, sku: true },
							},
							variant: {
								select: { id: true, name: true, sku: true },
							},
							warehouse: {
								select: { id: true, name: true, code: true },
							},
						},
					},
				},
			}),
			neonClient.inventoryMovement.count({ where }),
		]);

		const pagination = {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		};

		return actionSuccess(
			{ movements, pagination },
			"Stock movements retrieved successfully",
		);
	} catch (error) {
		console.error("Error fetching stock movements:", error);
		return actionError("Failed to fetch stock movements");
	}
}

// Get low stock alerts
export async function getLowStockAlerts(): Promise<ActionResponse> {
	try {
		const lowStockItems = await neonClient.inventoryItem.findMany({
			where: {
				quantity: { gt: 0 },
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						sku: true,
						minStock: true,
						reorderPoint: true,
					},
				},
				variant: {
					select: { id: true, name: true, sku: true },
				},
				warehouse: {
					select: { id: true, name: true, code: true },
				},
			},
		});

		const filteredItems = lowStockItems.filter((item) => {
			const minStock = item.product.minStock || 0;
			const reorderPoint = item.product.reorderPoint || 0;
			return (
				(minStock > 0 && item.quantity <= minStock) ||
				(reorderPoint > 0 && item.quantity <= reorderPoint)
			);
		});

		return actionSuccess(
			filteredItems,
			"Low stock alerts retrieved successfully",
		);
	} catch (error) {
		console.error("Error fetching low stock alerts:", error);
		return actionError("Failed to fetch low stock alerts");
	}
}
