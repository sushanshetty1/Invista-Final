import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { status, notes, plannedDate } = body;

		const audit = await neonClient.inventoryAudit.update({
			where: {
				id: id,
			},
			data: {
				...(status && { status }),
				...(notes && { notes }),
				...(plannedDate && { plannedDate: new Date(plannedDate) }),
			},
		});

		// Transform to schedule format
		const schedule = {
			id: audit.id,
			name: `Cycle Count - ${audit.warehouseId || "All Warehouses"}`,
			auditNumber: audit.auditNumber,
			warehouseId: audit.warehouseId,
			status: audit.status,
			plannedDate: audit.plannedDate,
			nextCountDate: audit.plannedDate,
			auditType: audit.auditType,
			createdAt: audit.createdAt,
		};

		return NextResponse.json(schedule);
	} catch (error) {
		console.error("Error updating cycle count schedule:", error);
		return NextResponse.json(
			{ error: "Failed to update cycle count schedule" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		await neonClient.inventoryAudit.delete({
			where: {
				id: id,
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting cycle count schedule:", error);
		return NextResponse.json(
			{ error: "Failed to delete cycle count schedule" },
			{ status: 500 },
		);
	}
}
