import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<Promise<{ id: string }>> },
) {
	try {
		const { id } = await params;

		const auditItems = await neonClient.inventoryAuditItem.findMany({
			where: { auditId: id },
			include: {
				inventoryItem: {
					include: {
						product: {
							select: {
								name: true,
								sku: true,
							},
						},
						warehouse: {
							select: {
								name: true,
							},
						},
					},
				},
			},
			orderBy: { countedAt: "asc" },
		});

		const transformedItems = auditItems.map((item) => {
			// Build location string from inventoryItem fields
			const locationParts = [
				item.inventoryItem.zone,
				item.inventoryItem.aisle,
				item.inventoryItem.shelf,
				item.inventoryItem.bin,
			].filter(Boolean);
			const location = locationParts.length > 0 ? locationParts.join("-") : null;

			return {
				id: item.id,
				productId: item.productId,
				productName: item.inventoryItem.product.name,
				sku: item.inventoryItem.product.sku,
				warehouseId: item.warehouseId,
				warehouseName: item.inventoryItem.warehouse.name,
				location,
				expectedQuantity: item.expectedQuantity,
				countedQuantity: item.countedQuantity,
				variance: item.variance,
				status: item.status,
				countedById: item.countedById,
				countedAt: item.countedAt,
				verifiedById: item.verifiedById,
				verifiedAt: item.verifiedAt,
				discrepancyReason: item.discrepancyReason,
				notes: item.notes,
			};
		});

		return NextResponse.json({
			items: transformedItems,
		});
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
