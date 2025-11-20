import { NextResponse } from "next/server";

import { getOrderAnalytics } from "@/lib/actions/orders";

export async function GET() {
	try {
		const result = await getOrderAnalytics();

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Order analytics API error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
