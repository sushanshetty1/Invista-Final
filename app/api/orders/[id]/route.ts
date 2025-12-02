import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/actions/orders";

// GET /api/orders/[id]
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const { id } = params;

		const result = await getOrderById(id);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 404 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Get order API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
