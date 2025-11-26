"use server";

import { neonClient } from "@/lib/prisma";
import {
    actionSuccess,
    actionError,
    type ActionResponse,
} from "@/lib/api-utils";
import { revalidatePath } from "next/cache";

// Types for inventory operations
interface CreateInventoryItemInput {
    productId: string;
    variantId?: string | null;
    warehouseId: string;
    quantity: number;
    reservedQuantity?: number;
    status?: "AVAILABLE" | "RESERVED" | "QUARANTINE" | "DAMAGED" | "EXPIRED";
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
    lotNumber?: string;
    batchNumber?: string;
    expiryDate?: Date;
}

interface UpdateInventoryItemInput {
    id: string;
    quantity?: number;
    reservedQuantity?: number;
    status?: "AVAILABLE" | "RESERVED" | "QUARANTINE" | "DAMAGED" | "EXPIRED";
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
    lotNumber?: string;
    batchNumber?: string;
    expiryDate?: Date;
}

interface StockMovementInput {
    inventoryItemId: string;
    type: "RECEIPT" | "SHIPMENT" | "ADJUSTMENT" | "TRANSFER_OUT" | "TRANSFER_IN" | "RETURN" | "DAMAGE";
    quantity: number;
    reason?: string;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
    createdById: string;
}

interface StockReservationInput {
    inventoryItemId: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    reservedFor: string;
    referenceId?: string;
    expiresAt?: Date;
    reason?: string;
    notes?: string;
    createdById: string;
}

interface InventoryQueryInput {
    companyId: string;
    warehouseId?: string;
    productId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

// Create inventory item
export async function createInventoryItem(
    input: CreateInventoryItemInput,
): Promise<ActionResponse> {
    try {
        // Validate references exist
        const [product, warehouse] = await Promise.all([
            neonClient.product.findUnique({ where: { id: input.productId } }),
            neonClient.warehouse.findUnique({ where: { id: input.warehouseId } }),
        ]);

        if (!product) return actionError("Product not found");
        if (!warehouse) return actionError("Warehouse not found");

        if (input.variantId) {
            const variant = await neonClient.productVariant.findUnique({
                where: { id: input.variantId },
            });
            if (!variant) return actionError("Product variant not found");
        }

        // Note: InventoryItem does NOT have availableQuantity field
        // availableQuantity is computed as (quantity - reservedQuantity)
        const inventoryItem = await neonClient.inventoryItem.create({
            data: {
                productId: input.productId,
                variantId: input.variantId || null,
                warehouseId: input.warehouseId,
                quantity: input.quantity,
                reservedQuantity: input.reservedQuantity || 0,
                status: input.status || "AVAILABLE",
                zone: input.zone,
                aisle: input.aisle,
                shelf: input.shelf,
                bin: input.bin,
                lotNumber: input.lotNumber,
                batchNumber: input.batchNumber,
                expiryDate: input.expiryDate,
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
        const existingItem = await neonClient.inventoryItem.findUnique({
            where: { id: input.id },
        });

        if (!existingItem) return actionError("Inventory item not found");

        const inventoryItem = await neonClient.inventoryItem.update({
            where: { id: input.id },
            data: {
                quantity: input.quantity,
                reservedQuantity: input.reservedQuantity,
                status: input.status,
                zone: input.zone,
                aisle: input.aisle,
                shelf: input.shelf,
                bin: input.bin,
                lotNumber: input.lotNumber,
                batchNumber: input.batchNumber,
                expiryDate: input.expiryDate,
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

// Create stock movement
export async function createStockMovement(
    input: StockMovementInput,
): Promise<ActionResponse> {
    try {
        // Find inventory item
        const inventoryItem = await neonClient.inventoryItem.findUnique({
            where: { id: input.inventoryItemId },
        });

        if (!inventoryItem) return actionError("Inventory item not found");

        const quantityBefore = inventoryItem.quantity;
        const isInbound = ["RECEIPT", "TRANSFER_IN", "RETURN"].includes(input.type);
        const quantityChange = isInbound ? Math.abs(input.quantity) : -Math.abs(input.quantity);
        const quantityAfter = quantityBefore + quantityChange;

        if (quantityAfter < 0) {
            return actionError("Insufficient stock for this movement");
        }

        // Create movement and update inventory in transaction
        const result = await neonClient.$transaction(async (tx) => {
            // Update inventory quantity
            const updatedItem = await tx.inventoryItem.update({
                where: { id: input.inventoryItemId },
                data: {
                    quantity: quantityAfter,
                },
            });

            // Create movement record
            // Note: InventoryMovement does NOT have productId, warehouseId, etc.
            // It only links to inventoryItem
            const movement = await tx.inventoryMovement.create({
                data: {
                    inventoryItemId: input.inventoryItemId,
                    type: input.type,
                    quantity: quantityChange,
                    quantityBefore,
                    quantityAfter,
                    reason: input.reason,
                    notes: input.notes,
                    referenceType: input.referenceType,
                    referenceId: input.referenceId,
                    createdById: input.createdById,
                },
            });

            return { inventoryItem: updatedItem, movement };
        });

        revalidatePath("/inventory/stock");
        revalidatePath("/inventory/movements");
        return actionSuccess(result, "Stock movement recorded successfully");
    } catch (error) {
        console.error("Error creating stock movement:", error);
        return actionError("Failed to record stock movement");
    }
}

// Adjust stock (wrapper for stock movement with ADJUSTMENT type)
export async function adjustStock(
    inventoryItemId: string,
    newQuantity: number,
    reason: string,
    createdById: string,
): Promise<ActionResponse> {
    try {
        const inventoryItem = await neonClient.inventoryItem.findUnique({
            where: { id: inventoryItemId },
        });

        if (!inventoryItem) return actionError("Inventory item not found");

        const quantityBefore = inventoryItem.quantity;
        const quantityChange = newQuantity - quantityBefore;

        const result = await neonClient.$transaction(async (tx) => {
            const updatedItem = await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: { quantity: newQuantity },
            });

            const movement = await tx.inventoryMovement.create({
                data: {
                    inventoryItemId,
                    type: "ADJUSTMENT",
                    quantity: quantityChange,
                    quantityBefore,
                    quantityAfter: newQuantity,
                    reason,
                    createdById,
                },
            });

            return { inventoryItem: updatedItem, movement };
        });

        revalidatePath("/inventory/stock");
        return actionSuccess(result, "Stock adjusted successfully");
    } catch (error) {
        console.error("Error adjusting stock:", error);
        return actionError("Failed to adjust stock");
    }
}

// Reserve stock
export async function reserveStock(
    input: StockReservationInput,
): Promise<ActionResponse> {
    try {
        const inventoryItem = await neonClient.inventoryItem.findUnique({
            where: { id: input.inventoryItemId },
        });

        if (!inventoryItem) return actionError("Inventory item not found");

        // Check available quantity (quantity - reservedQuantity)
        const availableQty = inventoryItem.quantity - inventoryItem.reservedQuantity;
        if (availableQty < input.quantity) {
            return actionError(`Insufficient available stock. Available: ${availableQty}`);
        }

        const result = await neonClient.$transaction(async (tx) => {
            // Update reserved quantity on inventory item
            const updatedItem = await tx.inventoryItem.update({
                where: { id: input.inventoryItemId },
                data: {
                    reservedQuantity: inventoryItem.reservedQuantity + input.quantity,
                },
            });

            // Create reservation record
            // Note: StockReservation uses 'reservedFor' not 'reservationType'
            const reservation = await tx.stockReservation.create({
                data: {
                    inventoryItemId: input.inventoryItemId,
                    productId: input.productId,
                    warehouseId: input.warehouseId,
                    quantity: input.quantity,
                    reservedFor: input.reservedFor,
                    referenceId: input.referenceId,
                    expiresAt: input.expiresAt,
                    reason: input.reason,
                    notes: input.notes,
                    createdById: input.createdById,
                    status: "ACTIVE",
                },
            });

            return { inventoryItem: updatedItem, reservation };
        });

        revalidatePath("/inventory/stock");
        return actionSuccess(result, "Stock reserved successfully");
    } catch (error) {
        console.error("Error reserving stock:", error);
        return actionError("Failed to reserve stock");
    }
}

// Get inventory with filtering
export async function getInventory(
    input: InventoryQueryInput,
): Promise<ActionResponse> {
    try {
        const {
            companyId,
            warehouseId,
            productId,
            status,
            search,
            page = 1,
            limit = 20,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = input;

        // Build where clause
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        // Filter by company through product relation
        if (companyId) {
            where.product = { companyId };
        }

        if (warehouseId) where.warehouseId = warehouseId;
        if (productId) where.productId = productId;
        if (status) where.status = status;

        if (search) {
            where.OR = [
                { product: { name: { contains: search, mode: "insensitive" } } },
                { product: { sku: { contains: search, mode: "insensitive" } } },
                { lotNumber: { contains: search, mode: "insensitive" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            neonClient.inventoryItem.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            costPrice: true,
                            reorderPoint: true,
                        },
                    },
                    variant: { select: { id: true, name: true, sku: true } },
                    warehouse: { select: { id: true, name: true, code: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            neonClient.inventoryItem.count({ where }),
        ]);

        // Compute availableQuantity for each item
        const itemsWithAvailable = items.map((item) => ({
            ...item,
            availableQuantity: item.quantity - item.reservedQuantity,
        }));

        return actionSuccess(
            {
                items: itemsWithAvailable,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
            `Retrieved ${items.length} inventory items`,
        );
    } catch (error) {
        console.error("Error fetching inventory:", error);
        return actionError("Failed to fetch inventory");
    }
}

// Get stock movements
export async function getStockMovements(
    inventoryItemId?: string,
    page = 1,
    limit = 50,
): Promise<ActionResponse> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        if (inventoryItemId) where.inventoryItemId = inventoryItemId;

        const skip = (page - 1) * limit;

        const [movements, total] = await Promise.all([
            neonClient.inventoryMovement.findMany({
                where,
                include: {
                    inventoryItem: {
                        include: {
                            product: { select: { id: true, name: true, sku: true } },
                            warehouse: { select: { id: true, name: true, code: true } },
                        },
                    },
                },
                orderBy: { occurredAt: "desc" },
                skip,
                take: limit,
            }),
            neonClient.inventoryMovement.count({ where }),
        ]);

        return actionSuccess(
            {
                movements,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
            `Retrieved ${movements.length} stock movements`,
        );
    } catch (error) {
        console.error("Error fetching stock movements:", error);
        return actionError("Failed to fetch stock movements");
    }
}

// Get low stock alerts
export async function getLowStockAlerts(companyId: string): Promise<ActionResponse> {
    try {
        // Get inventory items where quantity is below reorderPoint
        const items = await neonClient.inventoryItem.findMany({
            where: {
                product: { companyId },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        reorderPoint: true,
                    },
                },
                warehouse: { select: { id: true, name: true, code: true } },
            },
        });

        // Filter items below reorder point
        const alerts = items.filter(
            (item) => item.product.reorderPoint && item.quantity <= item.product.reorderPoint,
        );

        const formattedAlerts = alerts.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            warehouseId: item.warehouseId,
            warehouseName: item.warehouse.name,
            currentStock: item.quantity,
            reorderPoint: item.product.reorderPoint,
            deficit: (item.product.reorderPoint || 0) - item.quantity,
        }));

        return actionSuccess(formattedAlerts, `Found ${alerts.length} low stock alerts`);
    } catch (error) {
        console.error("Error fetching low stock alerts:", error);
        return actionError("Failed to fetch low stock alerts");
    }
}

// Transfer stock is not supported in new schema (no stockTransfer model)
// This function is stubbed to return an error
export async function transferStock(): Promise<ActionResponse> {
    return actionError("Stock transfers are not yet implemented in this version");
}
