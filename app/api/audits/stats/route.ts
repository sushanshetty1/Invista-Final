import { NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET() {
	try {
		const now = new Date();
		const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		// Get total audits
		const totalAudits = await neonClient.inventoryAudit.count();

		// Get active audits (in progress)
		const activeAudits = await neonClient.inventoryAudit.count({
			where: { status: "IN_PROGRESS" },
		});

		// Get completed audits this month
		const completedThisMonth = await neonClient.inventoryAudit.count({
			where: {
				status: "COMPLETED",
				completedAt: {
					gte: thisMonth,
				},
			},
		});

		// Get pending approval audits (completed but not approved)
		const pendingApproval = await neonClient.inventoryAudit.count({
			where: {
				status: "COMPLETED",
				approvedAt: null,
			},
		});

		// Get discrepancies found - variance is the field for adjustment quantity
		const discrepancyItems = await neonClient.inventoryAuditItem.findMany({
			where: {
				variance: {
					not: 0,
				},
			},
			select: {
				variance: true,
				productId: true,
			},
		});

		// Fetch product cost prices for discrepancy value calculation
		const productIds = [...new Set(discrepancyItems.map(item => item.productId))];
		const products = productIds.length > 0
			? await neonClient.product.findMany({
				where: { id: { in: productIds } },
				select: { id: true, costPrice: true },
			})
			: [];
		const productMap = new Map(products.map(p => [p.id, p]));

		const discrepanciesFound = discrepancyItems.length;
		const discrepancyValue = discrepancyItems.reduce((sum: number, item) => {
			const product = productMap.get(item.productId);
			const costPrice = product?.costPrice ? Number(product.costPrice) : 0;
			const adjustmentValue = (item.variance || 0) * costPrice;
			return sum + Math.abs(adjustmentValue);
		}, 0);

		// Calculate compliance score (example calculation)
		const onTimeAudits = await getOnTimeAuditsCount();
		const complianceScore = totalAudits
			? Math.round((onTimeAudits / totalAudits) * 100)
			: 100;

		// Get last audit date
		const lastAudit = await neonClient.inventoryAudit.findFirst({
			where: { status: "COMPLETED" },
			orderBy: { completedAt: "desc" },
			select: { completedAt: true },
		});

		// Get next scheduled audit
		const nextAudit = await neonClient.inventoryAudit.findFirst({
			where: { status: "PLANNED" },
			orderBy: { plannedDate: "asc" },
			select: { plannedDate: true },
		});

		// Get cycle counting stats
		const cycleCounts = await getCycleCountStats();

		return NextResponse.json({
			totalAudits,
			activeAudits,
			completedThisMonth,
			pendingApproval,
			discrepanciesFound,
			discrepancyValue,
			complianceScore,
			lastAuditDate: lastAudit?.completedAt || null,
			nextScheduledAudit: nextAudit?.plannedDate || null,
			cycleCounts,
		});
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function getOnTimeAuditsCount(): Promise<number> {
	try {
		const audits = await neonClient.inventoryAudit.findMany({
			where: {
				status: "COMPLETED",
				completedAt: { not: null },
			},
			select: { plannedDate: true, completedAt: true },
		});

		const onTimeAudits = audits.filter((audit) => {
			if (!audit.plannedDate || !audit.completedAt) return false;
			const plannedDate = new Date(audit.plannedDate);
			const completedDate = new Date(audit.completedAt);
			// Consider on-time if completed within 1 day of planned date
			const diffInDays =
				Math.abs(completedDate.getTime() - plannedDate.getTime()) /
				(1000 * 60 * 60 * 24);
			return diffInDays <= 1;
		});

		return onTimeAudits.length;
	} catch (error) {
		console.error("Error calculating on-time audits:", error);
		return 0;
	}
}

async function getCycleCountStats() {
	try {
		// This would connect to cycle count schedules table
		// For now, return mock data
		return {
			scheduled: 15,
			completed: 12,
			pending: 3,
		};
	} catch (error) {
		console.error("Error getting cycle count stats:", error);
		return {
			scheduled: 0,
			completed: 0,
			pending: 0,
		};
	}
}
