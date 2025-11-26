import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		// Start the cycle count by updating audit status and generating audit items
		const audit = await neonClient.inventoryAudit.findUnique({
			where: {
				id,
			},
		});

		if (!audit) {
			return NextResponse.json(
				{ error: "Cycle count schedule not found" },
				{ status: 404 },
			);
		}

		if (audit.status !== "PLANNED") {
			return NextResponse.json(
				{ error: "Cycle count can only be started from PLANNED status" },
				{ status: 400 },
			);
		}

		// Update audit status
		await neonClient.inventoryAudit.update({
			where: { id },
			data: {
				status: "IN_PROGRESS",
				startedAt: new Date(),
			},
		});

		// Generate audit items based on warehouse selection
		let inventoryItems;

		if (audit.warehouseId) {
			// Warehouse-specific audit (limit to ABC items for cycle counting)
			inventoryItems = await neonClient.inventoryItem.findMany({
				where: {
					warehouseId: audit.warehouseId,
					quantity: { gt: 0 },
				},
				include: {
					product: true,
					variant: true,
					warehouse: true,
				},
				take: 100, // Limit for cycle counting
			});
		} else {
			// Full inventory audit (should be rare for cycle counts)
			inventoryItems = await neonClient.inventoryItem.findMany({
				where: {
					quantity: { gt: 0 },
				},
				include: {
					product: true,
					variant: true,
					warehouse: true,
				},
				take: 50, // Very limited for cycle counts
			});
		}

		// Create audit items
		const auditItemsData = inventoryItems.map((item) => ({
			auditId: id,
			inventoryItemId: item.id,
			productId: item.productId,
			warehouseId: item.warehouseId,
			expectedQuantity: item.quantity,
			status: "PENDING" as const,
		}));

		if (auditItemsData.length > 0) {
			await neonClient.inventoryAuditItem.createMany({
				data: auditItemsData,
			});
		}

		// Update audit with totals
		await neonClient.inventoryAudit.update({
			where: { id },
			data: {
				itemsPlanned: auditItemsData.length,
				itemsCounted: 0,
			},
		});

		return NextResponse.json({
			success: true,
			message: "Cycle count started successfully",
			itemsGenerated: auditItemsData.length,
		});
	} catch (error) {
		console.error("Error starting cycle count:", error);
		return NextResponse.json(
			{ error: "Failed to start cycle count" },
			{ status: 500 },
		);
	}
}
