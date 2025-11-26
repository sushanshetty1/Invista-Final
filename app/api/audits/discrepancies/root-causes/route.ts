import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30";
		const limit = parseInt(searchParams.get("limit") || "20");

		const periodDays = parseInt(period);
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - periodDays);

		// Get audit items with discrepancies that have reasons
		const discrepancyItems = await neonClient.inventoryAuditItem.findMany({
			where: {
				audit: {
					completedAt: { gte: dateFrom },
					status: "COMPLETED",
				},
				variance: { not: 0 },
				discrepancyReason: { not: null },
			},
			select: {
				discrepancyReason: true,
				variance: true,
				requiresInvestigation: true,
				productId: true,
				warehouseId: true,
				audit: {
					select: { completedAt: true, auditType: true },
				},
			},
			take: 1000, // Large sample for analysis
		});

		// Fetch product and warehouse details separately
		const productIds = [...new Set(discrepancyItems.map(i => i.productId))];
		const warehouseIds = [...new Set(discrepancyItems.map(i => i.warehouseId))];

		const [products, warehouses] = await Promise.all([
			neonClient.product.findMany({
				where: { id: { in: productIds } },
				select: { id: true, name: true, sku: true },
			}),
			neonClient.warehouse.findMany({
				where: { id: { in: warehouseIds } },
				select: { id: true, name: true },
			}),
		]);

		const productMap = new Map(products.map(p => [p.id, p]));
		const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

		// Aggregate root causes
		const rootCauseStats = discrepancyItems.reduce(
			(acc, item) => {
				const reason = item.discrepancyReason || "Unknown";
				const product = productMap.get(item.productId);
				const warehouse = warehouseMap.get(item.warehouseId);

				if (!acc[reason]) {
					acc[reason] = {
						reason,
						count: 0,
						totalAdjustment: 0,
						averageAdjustment: 0,
						investigationsRequired: 0,
						affectedProducts: new Set(),
						affectedWarehouses: new Set(),
						auditTypes: {},
						severity: "LOW",
					};
				}

				acc[reason].count += 1;
				acc[reason].totalAdjustment += Math.abs(item.variance || 0);

				if (item.requiresInvestigation) {
					acc[reason].investigationsRequired += 1;
				}

				if (product?.name) {
					acc[reason].affectedProducts.add(product.name);
				}

				if (warehouse?.name) {
					acc[reason].affectedWarehouses.add(warehouse.name);
				}
				const auditType = item.audit?.auditType || "UNKNOWN";
				acc[reason].auditTypes[auditType] =
					(acc[reason].auditTypes[auditType] || 0) + 1;

				return acc;
			},
			{} as Record<
				string,
				{
					reason: string;
					count: number;
					totalAdjustment: number;
					averageAdjustment?: number;
					affectedProducts: Set<string>;
					affectedWarehouses: Set<string>;
					affectedProductsCount?: number;
					affectedWarehousesCount?: number;
					auditTypes: Record<string, number>;
					severity?: string;
					investigationsRequired: number;
					investigationRate?: number;
				}
			>,
		);

		// Calculate averages and determine severity
		const rootCauses = Object.values(rootCauseStats)
			.map((cause) => {
				cause.averageAdjustment =
					Math.round((cause.totalAdjustment / cause.count) * 100) / 100;
				cause.affectedProductsCount = cause.affectedProducts.size;
				cause.affectedWarehousesCount = cause.affectedWarehouses.size;

				// Determine severity based on frequency and impact
				if (
					cause.count >= 20 ||
					(cause.averageAdjustment && cause.averageAdjustment >= 50)
				) {
					cause.severity = "HIGH";
				} else if (
					cause.count >= 10 ||
					(cause.averageAdjustment && cause.averageAdjustment >= 20)
				) {
					cause.severity = "MEDIUM";
				} else {
					cause.severity = "LOW";
				}

				// Calculate investigation rate
				cause.investigationRate =
					cause.count > 0
						? Math.round((cause.investigationsRequired / cause.count) * 100)
						: 0;

				// Remove Sets (not JSON serializable) and return clean object
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					affectedProducts: _affectedProducts,
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					affectedWarehouses: _affectedWarehouses,
					...cleanCause
				} = cause;

				return {
					...cleanCause,
					affectedProductsCount: cause.affectedProductsCount,
					affectedWarehousesCount: cause.affectedWarehousesCount,
				};
			})
			.sort((a, b) => b.count - a.count)
			.slice(0, limit);

		// Common predefined reasons for reference
		const commonReasons = [
			"Shrinkage/Theft",
			"Receiving Error",
			"Shipping Error",
			"Location Mismatch",
			"System Error",
			"Damaged Goods",
			"Counting Error",
			"Expired Products",
			"Return Processing",
			"Production Variance",
			"Transfer Discrepancy",
			"Vendor Short/Over Shipment",
		];

		// Generate recommendations based on top causes
		const recommendations = rootCauses.slice(0, 5).map((cause) => {
			let recommendation = "";

			switch (cause.reason.toLowerCase()) {
				case "shrinkage/theft":
				case "shrinkage":
				case "theft":
					recommendation =
						"Implement enhanced security measures and increase cycle count frequency";
					break;
				case "receiving error":
				case "receiving":
					recommendation =
						"Improve receiving process training and implement dual verification";
					break;
				case "location mismatch":
				case "location":
					recommendation =
						"Review warehouse layout and implement location verification technology";
					break;
				case "counting error":
				case "counting":
					recommendation =
						"Provide additional training for counting procedures and implement count verification";
					break;
				case "system error":
				case "system":
					recommendation =
						"Review system processes and implement automated data validation";
					break;
				default:
					recommendation =
						"Investigate process improvements and implement preventive measures";
			}

			return {
				cause: cause.reason,
				recommendation,
				priority: cause.severity,
				frequency: cause.count,
			};
		});

		return NextResponse.json({
			rootCauses,
			totalDiscrepancies: discrepancyItems.length,
			period: periodDays,
			recommendations,
			commonReasons,
			summary: {
				mostCommonCause: rootCauses[0]?.reason || "No data",
				highSeverityCauses: rootCauses.filter((c) => c.severity === "HIGH")
					.length,
				averageInvestigationRate:
					rootCauses.length > 0
						? Math.round(
							rootCauses.reduce(
								(sum, c) => sum + (c.investigationRate || 0),
								0,
							) / rootCauses.length,
						)
						: 0,
			},
		});
	} catch (error) {
		console.error("Error fetching root cause analysis:", error);
		return NextResponse.json(
			{ error: "Failed to fetch root cause analysis" },
			{ status: 500 },
		);
	}
}
