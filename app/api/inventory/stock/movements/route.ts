import { neonClient } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/inventory/stock/movements - List stock movements
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "50");
		const type = searchParams.get("type") || "";
		const warehouseId = searchParams.get("warehouseId") || "";
		const productId = searchParams.get("productId") || "";
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		const skip = (page - 1) * limit;

		// Build where clause - filter through inventoryItem relation since InventoryMovement
		// only has inventoryItemId, not direct product/warehouse references
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {};

		if (type) where.type = type;
		if (warehouseId) where.inventoryItem = { ...where.inventoryItem, warehouseId };
		if (productId) where.inventoryItem = { ...where.inventoryItem, productId };

		if (startDate || endDate) {
			where.occurredAt = {};
			if (startDate) where.occurredAt.gte = new Date(startDate);
			if (endDate) where.occurredAt.lte = new Date(endDate);
		}

		// Fetch movements with relations through inventoryItem
		const [movements, total] = await Promise.all([
			neonClient.inventoryMovement.findMany({
				where,
				include: {
					inventoryItem: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
							variant: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
							warehouse: {
								select: {
									id: true,
									name: true,
									code: true,
								},
							},
						},
					},
				},
				orderBy: { occurredAt: "desc" },
				skip,
				take: limit,
			}),
			neonClient.inventoryMovement.count({ where }),
		]);

		// Flatten the response for easier consumption
		const formattedMovements = movements.map((m) => ({
			id: m.id,
			type: m.type,
			quantity: m.quantity,
			quantityBefore: m.quantityBefore,
			quantityAfter: m.quantityAfter,
			reason: m.reason,
			referenceType: m.referenceType,
			referenceId: m.referenceId,
			notes: m.notes,
			occurredAt: m.occurredAt,
			createdAt: m.createdAt,
			product: m.inventoryItem.product,
			variant: m.inventoryItem.variant,
			warehouse: m.inventoryItem.warehouse,
		}));

		return NextResponse.json({
			movements: formattedMovements,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching stock movements:", error);
		return NextResponse.json(
			{ error: "Failed to fetch stock movements" },
			{ status: 500 },
		);
	}
}

// POST /api/inventory/stock/movements - Create new stock movement
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			type,
			productId,
			variantId,
			warehouseId,
			quantity,
			reason,
			notes,
			createdById,
			referenceType,
			referenceId,
			lotNumber,
			batchNumber,
			expiryDate,
		} = body;

		if (!type || !productId || !warehouseId || !quantity || !createdById) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Find or create inventory item
		let inventoryItem = await neonClient.inventoryItem.findFirst({
			where: {
				productId,
				variantId: variantId || null,
				warehouseId,
				lotNumber: lotNumber || null,
			},
		});

		const quantityBefore = inventoryItem?.quantity || 0;
		const isInbound = ["RECEIPT", "TRANSFER_IN", "RETURN"].includes(type);
		const quantityChange = isInbound ? quantity : -quantity;
		const quantityAfter = quantityBefore + quantityChange;

		if (!isInbound && quantityAfter < 0) {
			return NextResponse.json(
				{ error: "Insufficient stock for this movement" },
				{ status: 400 },
			);
		}

		// Create or update inventory item and movement in a transaction
		const result = await neonClient.$transaction(async (tx) => {
			// Create or update inventory item
			// Note: InventoryItem does NOT have availableQuantity, lastCost, lastMovement, qcStatus
			// availableQuantity is computed as (quantity - reservedQuantity)
			if (inventoryItem) {
				inventoryItem = await tx.inventoryItem.update({
					where: { id: inventoryItem.id },
					data: {
						quantity: quantityAfter,
						...(expiryDate && { expiryDate: new Date(expiryDate) }),
					},
				});
			} else {
				inventoryItem = await tx.inventoryItem.create({
					data: {
						productId,
						variantId,
						warehouseId,
						quantity: quantityAfter,
						reservedQuantity: 0,
						status: "AVAILABLE",
						lotNumber,
						batchNumber,
						expiryDate: expiryDate ? new Date(expiryDate) : null,
					},
				});
			}

			// Create movement record
			// Note: InventoryMovement does NOT have productId, variantId, warehouseId, unitCost, totalCost, userId, lotNumber, batchNumber, expiryDate
			// It only links to inventoryItem which has those relationships
			const movement = await tx.inventoryMovement.create({
				data: {
					type,
					inventoryItemId: inventoryItem.id,
					quantity: isInbound ? Math.abs(quantity) : -Math.abs(quantity),
					quantityBefore,
					quantityAfter,
					referenceType,
					referenceId,
					reason,
					notes,
					createdById,
				},
			});

			return { inventoryItem, movement };
		});

		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		console.error("Error creating stock movement:", error);
		return NextResponse.json(
			{ error: "Failed to create stock movement" },
			{ status: 500 },
		);
	}
}
