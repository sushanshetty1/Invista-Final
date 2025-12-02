import { type NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/actions/orders";
import { UpdateOrderStatusSchema } from "@/lib/validations/order";

// PATCH /api/orders/[id]/status
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const { id } = params;
		const body = await request.json();

		// Validate request body
		const validatedData = UpdateOrderStatusSchema.parse(body);

		const result = await updateOrderStatus({
			orderId: id,
			...validatedData,
		});

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Update order status API error:", error);
		if (error instanceof Error && error.name === "ZodError") {
			return NextResponse.json(
				{ error: "Invalid request data", details: error.message },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
