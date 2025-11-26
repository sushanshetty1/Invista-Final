import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30";
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = parseInt(searchParams.get("offset") || "0");
		const warehouseId = searchParams.get("warehouseId");
		const productId = searchParams.get("productId");
		const severity = searchParams.get("severity"); // 'HIGH', 'MEDIUM', 'LOW'

		const periodDays = parseInt(period);
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - periodDays);

		// Build where clause
		const where: Record<string, unknown> = {
			audit: {
				completedAt: { gte: dateFrom },
				status: "COMPLETED",
			},
			variance: { not: 0 },
		};

		if (warehouseId) {
			where.warehouseId = warehouseId;
		}

		if (productId) {
			where.productId = productId;
		}

		// Filter by severity (based on variance threshold)
		if (severity) {
			switch (severity) {
				case "HIGH":
					where.OR = [
						{ variance: { gte: 100 } },
						{ variance: { lte: -100 } },
					];
					break;
				case "MEDIUM":
					where.OR = [
						{ variance: { gte: 10, lt: 100 } },
						{ variance: { lte: -10, gt: -100 } },
					];
					break;
				case "LOW":
					where.OR = [
						{ variance: { gt: 0, lt: 10 } },
						{ variance: { lt: 0, gt: -10 } },
					];
					break;
			}
		}

		const [discrepancies, total] = await Promise.all([
			neonClient.inventoryAuditItem.findMany({
				where,
				include: {
					audit: {
						select: {
							id: true,
							auditNumber: true,
							auditType: true,
							completedAt: true,
							conductedBy: true,
						},
					},
					inventoryItem: {
						select: {
							id: true,
							zone: true,
							aisle: true,
							shelf: true,
							bin: true,
						},
					},
				},
				orderBy: [
					{ variance: "desc" }, // Largest discrepancies first
				],
				skip: offset,
				take: limit,
			}),
			neonClient.inventoryAuditItem.count({ where }),
		]);

		// Fetch product and warehouse details separately
		const productIds = [...new Set(discrepancies.map(d => d.productId))];
		const warehouseIds = [...new Set(discrepancies.map(d => d.warehouseId))];

		const [products, warehouses] = await Promise.all([
			neonClient.product.findMany({
				where: { id: { in: productIds } },
				select: { id: true, name: true, sku: true, description: true },
			}),
			neonClient.warehouse.findMany({
				where: { id: { in: warehouseIds } },
				select: { id: true, name: true, code: true },
			}),
		]);

		const productMap = new Map(products.map(p => [p.id, p]));
		const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

		// Transform and add calculated fields
		const enrichedDiscrepancies = discrepancies.map((item) => {
			const variance = item.variance || 0;
			const expectedQuantity = item.expectedQuantity || 0;
			const countedQuantity = item.countedQuantity || 0;
			const product = productMap.get(item.productId);
			const warehouse = warehouseMap.get(item.warehouseId);

			// Calculate severity
			let severityLevel = "LOW";
			const absVariance = Math.abs(variance);
			if (absVariance >= 100) {
				severityLevel = "HIGH";
			} else if (absVariance >= 10) {
				severityLevel = "MEDIUM";
			}

			// Calculate variance percentage
			const variancePercentage =
				expectedQuantity > 0
					? Math.round((variance / expectedQuantity) * 100 * 100) / 100
					: 0;

			// Build location string from inventoryItem
			const location = item.inventoryItem
				? [item.inventoryItem.zone, item.inventoryItem.aisle, item.inventoryItem.shelf, item.inventoryItem.bin].filter(Boolean).join("-")
				: null;

			return {
				id: item.id,
				audit: item.audit,
				product,
				warehouse,
				location,
				systemQty: expectedQuantity,
				countedQty: countedQuantity,
				adjustmentQty: variance,
				variancePercentage,
				severity: severityLevel,
				discrepancyReason: item.discrepancyReason,
				requiresInvestigation: item.requiresInvestigation,
				countedById: item.countedById,
				countedAt: item.countedAt,
				verifiedById: item.verifiedById,
				verifiedAt: item.verifiedAt,
				status: item.status,
				notes: item.notes,
			};
		});

		return NextResponse.json({
			discrepancies: enrichedDiscrepancies,
			total,
			hasMore: offset + limit < total,
			filters: {
				period: periodDays,
				warehouseId,
				productId,
				severity,
			},
		});
	} catch (error) {
		console.error("Error fetching discrepancies:", error);
		return NextResponse.json(
			{ error: "Failed to fetch discrepancies" },
			{ status: 500 },
		);
	}
}
