import type { NextRequest } from "next/server";
import {
	successResponse,
	errorResponse,
	handleError,
	checkRateLimit,
} from "@/lib/api-utils";
import { authenticate } from "@/lib/auth";
import {
	getWarehouses,
	createWarehouse,
	type WarehouseQueryInput,
	type CreateWarehouseInput,
} from "@/lib/actions/warehouses";

// Rate limiting: 100 requests per minute per IP
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000; // 1 minute

function getClientIdentifier(request: NextRequest): string {
	return (
		request.headers.get("x-forwarded-for") ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

// GET /api/inventory/warehouses - List warehouses
export async function GET(request: NextRequest) {
	try {
		// Rate limiting
		const clientId = getClientIdentifier(request);
		if (!checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW)) {
			return errorResponse("Rate limit exceeded", 429);
		}

		// Parse and validate query parameters
		const { searchParams } = new URL(request.url);

		const queryInput: WarehouseQueryInput = {
			page: parseInt(searchParams.get("page") || "1"),
			limit: Math.min(parseInt(searchParams.get("limit") || "20"), 100), // Max 100 items
			search: searchParams.get("search") || undefined,
			companyId: searchParams.get("companyId") || undefined,
			type:
				(searchParams.get("type") as
					| "STANDARD"
					| "DISTRIBUTION_CENTER"
					| "RETAIL_STORE"
					| "COLD_STORAGE"
					| "FULFILLMENT_CENTER") || undefined,
			isActive: searchParams.get("isActive")
				? searchParams.get("isActive") === "true"
				: undefined,
			sortBy:
				(searchParams.get("sortBy") as
					| "name"
					| "code"
					| "type"
					| "createdAt"
					| "updatedAt") || "name",
			sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
		};

		// Fetch warehouses using server action
		const result = await getWarehouses(queryInput);

		if (!result.success) {
			return errorResponse(result.error!, 400);
		}

		return successResponse(result.data, result.message);
	} catch (error) {
		return handleError(error);
	}
}

// POST /api/inventory/warehouses - Create warehouse
export async function POST(request: NextRequest) {
	try {
		// Rate limiting (stricter for write operations)
		const clientId = getClientIdentifier(request);
		if (!checkRateLimit(`${clientId}:write`, 20, RATE_WINDOW)) {
			return errorResponse("Rate limit exceeded for write operations", 429);
		}

		// Parse request body
		const body = await request.json();

		// Authentication check
		const user = await authenticate(request);
		if (!user) {
			return errorResponse("Unauthorized", 401);
		}

		// Create warehouse using server action (validation happens in the action)
		const result = await createWarehouse(body as CreateWarehouseInput);

		if (!result.success) {
			return errorResponse(result.error!, 400);
		}

		return successResponse(result.data, result.message, undefined);
	} catch (error) {
		return handleError(error);
	}
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
