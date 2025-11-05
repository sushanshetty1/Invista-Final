import { type NextRequest, NextResponse } from "next/server";
import { getOrders, createOrder } from "@/lib/actions/orders";
import { CreateOrderSchema } from "@/lib/validations/order";

// GET /api/orders
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;

		const filters: Record<string, unknown> = {};

		// Add string filters
		const stringFilters = [
			"status", "fulfillmentStatus", "paymentStatus", 
			"customerId", "warehouseId", "type", "channel", 
			"priority", "searchTerm", "dateFrom", "dateTo"
		];

		stringFilters.forEach(filter => {
			const value = searchParams.get(filter);
			if (value) filters[filter] = value;
		});

		// Add number filters
		const pageParam = searchParams.get("page");
		if (pageParam) {
			const page = parseInt(pageParam, 10);
			if (!Number.isNaN(page)) filters.page = page;
		}

		const limitParam = searchParams.get("limit");
		if (limitParam) {
			const limit = parseInt(limitParam, 10);
			if (!Number.isNaN(limit)) filters.limit = limit;
		}

		const result = await getOrders(filters);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Orders API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/orders
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		
		// Validate request body
		const validatedData = CreateOrderSchema.parse(body);

		const result = await createOrder(validatedData);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json({ order: result.data }, { status: 201 });
	} catch (error) {
		console.error("Create order API error:", error);
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
