import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30";
		const limit = parseInt(searchParams.get("limit") || "100");

		const periodDays = parseInt(period);
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - periodDays);

		// Get all audits and audit items for audit trail
		const audits = await neonClient.inventoryAudit.findMany({
			where: {
				createdAt: { gte: dateFrom },
			},
			include: {
				items: {
					where: {
						OR: [
							{ countedAt: { not: null } },
							{ verifiedAt: { not: null } },
							{ variance: { not: 0 } },
						],
					},
					select: {
						id: true,
						expectedQuantity: true,
						countedQuantity: true,
						variance: true,
						countedById: true,
						countedAt: true,
						verifiedById: true,
						verifiedAt: true,
						status: true,
						discrepancyReason: true,
						productId: true,
						warehouseId: true,
					},
					take: 50, // Limit items per audit for performance
				},
			},
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		// Transform to audit trail format
		const auditTrail = [];

		// Add audit-level events
		for (const audit of audits) {
			// Audit creation
			auditTrail.push({
				id: `audit-${audit.id}-created`,
				timestamp: audit.createdAt,
				event: "AUDIT_CREATED",
				entityType: "AUDIT",
				entityId: audit.id,
				description: `${audit.auditType} audit created: ${audit.auditNumber}`,
				performedBy: audit.conductedBy || audit.createdById,
				metadata: {
					auditNumber: audit.auditNumber,
					type: audit.auditType,
					warehouseId: audit.warehouseId,
					plannedDate: audit.plannedDate,
				},
			});

			// Audit started
			if (audit.startedAt) {
				auditTrail.push({
					id: `audit-${audit.id}-started`,
					timestamp: audit.startedAt,
					event: "AUDIT_STARTED",
					entityType: "AUDIT",
					entityId: audit.id,
					description: `Audit started: ${audit.auditNumber}`,
					performedBy: audit.conductedBy || audit.createdById,
					metadata: {
						auditNumber: audit.auditNumber,
						itemsPlanned: audit.itemsPlanned,
					},
				});
			}

			// Audit completed
			if (audit.completedAt) {
				auditTrail.push({
					id: `audit-${audit.id}-completed`,
					timestamp: audit.completedAt,
					event: "AUDIT_COMPLETED",
					entityType: "AUDIT",
					entityId: audit.id,
					description: `Audit completed: ${audit.auditNumber}`,
					performedBy: audit.conductedBy || audit.createdById,
					metadata: {
						auditNumber: audit.auditNumber,
						itemsCounted: audit.itemsCounted,
						discrepancies: audit.discrepancies,
					},
				});
			}

			// Add item-level events
			for (const item of audit.items) {
				// Item counted
				if (item.countedAt && item.countedById) {
					auditTrail.push({
						id: `item-${item.id}-counted`,
						timestamp: item.countedAt,
						event: "ITEM_COUNTED",
						entityType: "AUDIT_ITEM",
						entityId: item.id,
						description: `Item counted for product ${item.productId}`,
						performedBy: item.countedById,
						metadata: {
							auditNumber: audit.auditNumber,
							productId: item.productId,
							expectedQuantity: item.expectedQuantity,
							countedQuantity: item.countedQuantity,
							variance: item.variance,
						},
					});
				}

				// Item verified
				if (item.verifiedAt && item.verifiedById) {
					auditTrail.push({
						id: `item-${item.id}-verified`,
						timestamp: item.verifiedAt,
						event: "ITEM_VERIFIED",
						entityType: "AUDIT_ITEM",
						entityId: item.id,
						description: `Item verified for product ${item.productId}`,
						performedBy: item.verifiedById,
						metadata: {
							auditNumber: audit.auditNumber,
							productId: item.productId,
							countedQuantity: item.countedQuantity,
							variance: item.variance,
							discrepancyReason: item.discrepancyReason,
						},
					});
				}

				// Discrepancy found
				if (item.variance && item.variance !== 0) {
					auditTrail.push({
						id: `item-${item.id}-discrepancy`,
						timestamp: item.countedAt || item.verifiedAt || audit.createdAt,
						event: "DISCREPANCY_FOUND",
						entityType: "AUDIT_ITEM",
						entityId: item.id,
						description: `Discrepancy found: ${item.variance > 0 ? "+" : ""}${item.variance}`,
						performedBy: item.countedById || item.verifiedById || audit.conductedBy || audit.createdById,
						metadata: {
							auditNumber: audit.auditNumber,
							productId: item.productId,
							expectedQuantity: item.expectedQuantity,
							countedQuantity: item.countedQuantity,
							variance: item.variance,
							discrepancyReason: item.discrepancyReason,
							severity:
								Math.abs(item.variance) >= 100
									? "HIGH"
									: Math.abs(item.variance) >= 10
										? "MEDIUM"
										: "LOW",
						},
					});
				}
			}
		}

		// Sort by timestamp (most recent first)
		auditTrail.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

		// Calculate summary statistics
		const eventCounts = auditTrail.reduce(
			(acc, event) => {
				acc[event.event] = (acc[event.event] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const uniqueUsers = new Set(auditTrail.map((event) => event.performedBy))
			.size;
		const uniqueAudits = new Set(audits.map((audit) => audit.id)).size;
		const totalDiscrepancies = auditTrail.filter(
			(event) => event.event === "DISCREPANCY_FOUND",
		).length;

		return NextResponse.json({
			auditTrail: auditTrail.slice(0, limit),
			total: auditTrail.length,
			period: periodDays,
			summary: {
				totalEvents: auditTrail.length,
				uniqueUsers,
				uniqueAudits,
				totalDiscrepancies,
				eventBreakdown: eventCounts,
				mostActiveUser: getMostActiveUser(auditTrail),
				recentActivity: auditTrail.slice(0, 10).length,
			},
		});
	} catch (error) {
		console.error("Error fetching audit trail:", error);
		return NextResponse.json(
			{ error: "Failed to fetch audit trail" },
			{ status: 500 },
		);
	}
}

function getMostActiveUser(auditTrail: Array<{ performedBy: string }>) {
	const userCounts = auditTrail.reduce(
		(acc, event) => {
			acc[event.performedBy] = (acc[event.performedBy] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const mostActive = Object.entries(userCounts).sort(
		([, a], [, b]) => b - a,
	)[0];
	return mostActive ? { user: mostActive[0], events: mostActive[1] } : null;
}
