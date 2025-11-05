import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/actions/orders";

// GET /api/orders/[id]
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const result = await getOrderById(id);

		if (!result.success) {
			return NextResponse.json(
				{ error: result.error },
				{ status: result.error === "Order not found" ? 404 : 400 },
			);
		}

		return NextResponse.json({ order: result.data });
	} catch (error) {
		console.error("Get order API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
