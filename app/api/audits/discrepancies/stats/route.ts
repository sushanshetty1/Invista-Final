import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30";
		const warehouseId = searchParams.get("warehouseId");

		const periodDays = parseInt(period);
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - periodDays);

		// Build where clause for filtering
		const where: Record<string, unknown> = {
			completedAt: {
				gte: dateFrom,
			},
			status: "COMPLETED",
			discrepancies: { gt: 0 },
		};

		if (warehouseId) {
			where.warehouseId = warehouseId;
		}

		// Get audits with discrepancies
		const auditsWithDiscrepancies = await neonClient.inventoryAudit.findMany({
			where,
			include: {
				items: {
					where: {
						variance: { not: 0 },
					},
					select: {
						id: true,
						productId: true,
						variance: true,
					},
				},
			},
			orderBy: { completedAt: "desc" },
		});

		// Get warehouse and product details separately
		const warehouseIds = [...new Set(auditsWithDiscrepancies.map(a => a.warehouseId).filter(Boolean))] as string[];
		const productIds = [...new Set(auditsWithDiscrepancies.flatMap(a => a.items.map(i => i.productId)))];

		const [warehouses, products] = await Promise.all([
			warehouseIds.length > 0
				? neonClient.warehouse.findMany({
					where: { id: { in: warehouseIds } },
					select: { id: true, name: true, code: true },
				})
				: [],
			productIds.length > 0
				? neonClient.product.findMany({
					where: { id: { in: productIds } },
					select: { id: true, name: true, sku: true },
				})
				: [],
		]);

		const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
		const productMap = new Map(products.map(p => [p.id, p]));

		// Calculate summary stats
		const totalDiscrepancies = auditsWithDiscrepancies.reduce(
			(sum, audit) => sum + (audit.discrepancies || 0),
			0,
		);

		// Calculate total value impact from items variance
		const totalValueImpact = auditsWithDiscrepancies.reduce(
			(sum, audit) => {
				const auditValueImpact = audit.items.reduce((itemSum, item) => {
					return itemSum + Math.abs(item.variance || 0);
				}, 0);
				return sum + auditValueImpact;
			},
			0,
		);

		const averageDiscrepanciesPerAudit =
			auditsWithDiscrepancies.length > 0
				? totalDiscrepancies / auditsWithDiscrepancies.length
				: 0;

		// Group by warehouse
		const warehouseStats = auditsWithDiscrepancies.reduce(
			(acc, audit) => {
				const warehouse = audit.warehouseId ? warehouseMap.get(audit.warehouseId) : null;
				const warehouseName = warehouse?.name || "Unknown";
				if (!acc[warehouseName]) {
					acc[warehouseName] = {
						name: warehouseName,
						audits: 0,
						discrepancies: 0,
						valueImpact: 0,
					};
				}
				acc[warehouseName].audits += 1;
				acc[warehouseName].discrepancies += audit.discrepancies || 0;
				const auditValueImpact = audit.items.reduce((sum, item) => sum + Math.abs(item.variance || 0), 0);
				acc[warehouseName].valueImpact += auditValueImpact;
				return acc;
			},
			{} as Record<
				string,
				{
					name: string;
					audits: number;
					discrepancies: number;
					valueImpact: number;
				}
			>,
		);

		// Group by product
		const productStats = auditsWithDiscrepancies.reduce(
			(acc, audit) => {
				audit.items.forEach((item) => {
					const product = productMap.get(item.productId);
					const productName = product?.name || "Unknown";
					if (!acc[productName]) {
						acc[productName] = {
							name: productName,
							sku: product?.sku,
							discrepancies: 0,
							totalAdjustment: 0,
						};
					}
					if (item.variance !== 0) {
						acc[productName].discrepancies += 1;
						acc[productName].totalAdjustment += item.variance || 0;
					}
				});
				return acc;
			},
			{} as Record<
				string,
				{
					name: string;
					sku?: string;
					discrepancies: number;
					totalAdjustment: number;
				}
			>,
		);

		// Time series data (daily aggregation)
		const timeSeriesData = auditsWithDiscrepancies.reduce(
			(acc, audit) => {
				if (audit.completedAt) {
					const date = audit.completedAt.toISOString().split("T")[0];
					if (!acc[date]) {
						acc[date] = {
							date,
							audits: 0,
							discrepancies: 0,
							valueImpact: 0,
						};
					}
					acc[date].audits += 1;
					acc[date].discrepancies += audit.discrepancies || 0;
					const auditValueImpact = audit.items.reduce((sum, item) => sum + Math.abs(item.variance || 0), 0);
					acc[date].valueImpact += auditValueImpact;
				}
				return acc;
			},
			{} as Record<
				string,
				{
					date: string;
					audits: number;
					discrepancies: number;
					valueImpact: number;
				}
			>,
		);

		return NextResponse.json({
			summary: {
				totalAudits: auditsWithDiscrepancies.length,
				totalDiscrepancies,
				totalValueImpact,
				averageDiscrepanciesPerAudit:
					Math.round(averageDiscrepanciesPerAudit * 100) / 100,
				period: periodDays,
			},
			warehouseBreakdown: Object.values(warehouseStats),
			productBreakdown: Object.values(productStats).slice(0, 20), // Top 20
			timeSeriesData: Object.values(timeSeriesData).sort(
				(a: { date: string }, b: { date: string }) =>
					new Date(a.date).getTime() - new Date(b.date).getTime(),
			),
			recentDiscrepancies: auditsWithDiscrepancies
				.slice(0, 10)
				.map((audit) => {
					const warehouse = audit.warehouseId ? warehouseMap.get(audit.warehouseId) : null;
					const auditValueImpact = audit.items.reduce((sum, item) => sum + Math.abs(item.variance || 0), 0);
					return {
						id: audit.id,
						auditNumber: audit.auditNumber,
						warehouse: warehouse?.name,
						discrepancies: audit.discrepancies,
						valueImpact: auditValueImpact,
						completedDate: audit.completedAt,
						itemCount: audit.items.length,
					};
				}),
		});
	} catch (error) {
		console.error("Error fetching discrepancy stats:", error);
		return NextResponse.json(
			{ error: "Failed to fetch discrepancy statistics" },
			{ status: 500 },
		);
	}
}
