import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

// GET /api/audits - List all audits with optional filtering
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = parseInt(searchParams.get("offset") || "0");
		const type = searchParams.get("type");
		const status = searchParams.get("status");
		const warehouseId = searchParams.get("warehouseId");
		const dateRange = searchParams.get("dateRange");

		// Build where clause
		const where: Record<string, unknown> = {};
		if (type) where.auditType = type;
		if (status) where.status = status;
		if (warehouseId) where.warehouseId = warehouseId;

		// Date range filter
		if (dateRange) {
			const now = new Date();
			const fromDate = new Date();

			switch (dateRange) {
				case "today":
					fromDate.setHours(0, 0, 0, 0);
					break;
				case "week":
					fromDate.setDate(now.getDate() - 7);
					break;
				case "month":
					fromDate.setMonth(now.getMonth() - 1);
					break;
				case "quarter":
					fromDate.setMonth(now.getMonth() - 3);
					break;
			}

			where.createdAt = { gte: fromDate };
		}

		const [audits, totalCount] = await Promise.all([
			neonClient.inventoryAudit.findMany({
				where,
				include: {
					items: {
						select: { id: true },
					},
				},
				orderBy: { createdAt: "desc" },
				skip: offset,
				take: limit,
			}),
			neonClient.inventoryAudit.count({ where }),
		]);

		// Fetch warehouse names separately
		const warehouseIds = [...new Set(audits.map(a => a.warehouseId).filter(Boolean))] as string[];
		const warehouses = warehouseIds.length > 0
			? await neonClient.warehouse.findMany({
				where: { id: { in: warehouseIds } },
				select: { id: true, name: true },
			})
			: [];
		const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

		// Transform the data to match our interface
		const transformedAudits = audits.map((audit) => {
			const warehouse = audit.warehouseId ? warehouseMap.get(audit.warehouseId) : null;
			return {
				id: audit.id,
				auditNumber: audit.auditNumber,
				type: audit.auditType,
				method: audit.method,
				status: audit.status,
				warehouseId: audit.warehouseId,
				warehouseName: warehouse?.name,
				plannedDate: audit.plannedDate,
				startedDate: audit.startedAt,
				completedDate: audit.completedAt,
				conductedBy: audit.conductedBy,
				approvedBy: audit.approvedBy,
				totalItems: audit.itemsPlanned,
				itemsCounted: audit.itemsCounted,
				discrepancies: audit.discrepancies,
				notes: audit.notes,
				createdAt: audit.createdAt,
			};
		});

		return NextResponse.json({
			audits: transformedAudits,
			total: totalCount,
			limit,
			offset,
		});
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/audits - Create a new audit
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			type,
			method,
			warehouseId,
			plannedDate,
			notes,
			companyId = "", // Should come from auth context
		} = body;

		// Validate required fields
		if (!type || !method || !plannedDate) {
			return NextResponse.json(
				{ error: "Missing required fields: type, method, plannedDate" },
				{ status: 400 },
			);
		}

		// Generate audit number
		const auditNumber = `AUD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

		// Get current user (in a real app, this would come from authentication)
		const createdById = "current-user-id"; // Replace with actual user ID from auth

		const audit = await neonClient.inventoryAudit.create({
			data: {
				companyId,
				auditNumber,
				auditType: type,
				method,
				warehouseId: warehouseId || null,
				plannedDate: new Date(plannedDate),
				createdById,
				conductedBy: createdById,
				status: "PLANNED",
				notes: notes || null,
			},
		});

		// Generate audit items based on audit type and scope
		await generateAuditItems(audit.id, type, warehouseId);

		return NextResponse.json({
			audit: {
				id: audit.id,
				auditNumber: audit.auditNumber,
				type: audit.auditType,
				method: audit.method,
				status: audit.status,
				warehouseId: audit.warehouseId,
				plannedDate: audit.plannedDate,
				conductedBy: audit.conductedBy,
				notes: audit.notes,
				createdAt: audit.createdAt,
			},
		});
	} catch (error) {
		console.error("API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// Helper function to generate audit items
async function generateAuditItems(
	auditId: string,
	type: string,
	warehouseId?: string,
) {
	try {
		const where: Record<string, unknown> = {};
		if (warehouseId) where.warehouseId = warehouseId;

		const inventoryItems = await neonClient.inventoryItem.findMany({
			where,
			select: {
				id: true,
				productId: true,
				warehouseId: true,
				quantity: true,
			},
			take: type === "CYCLE_COUNT" ? 100 : undefined, // Limit cycle count items
		});

		// Create audit items
		const auditItems = inventoryItems.map((item) => ({
			auditId,
			inventoryItemId: item.id,
			productId: item.productId,
			warehouseId: item.warehouseId,
			expectedQuantity: item.quantity,
			status: "PENDING" as const,
		}));

		await neonClient.inventoryAuditItem.createMany({
			data: auditItems,
		});

		// Update audit with total items count
		await neonClient.inventoryAudit.update({
			where: { id: auditId },
			data: { itemsPlanned: auditItems.length },
		});
	} catch (error) {
		console.error("Error generating audit items:", error);
	}
}
