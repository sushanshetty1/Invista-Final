import type { NextRequest } from "next/server";
import {
	successResponse,
	errorResponse,
	handleError,
	checkRateLimit,
} from "@/lib/api-utils";
import { authenticate } from "@/lib/auth";
import {
	getWarehouse,
	updateWarehouse,
	deleteWarehouse,
	type UpdateWarehouseInput,
} from "@/lib/actions/warehouses";

// Rate limiting
const RATE_LIMIT = 60;
const RATE_WINDOW = 60 * 1000; // 1 minute

function getClientIdentifier(request: NextRequest): string {
	return (
		request.headers.get("x-forwarded-for") ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

// GET /api/inventory/warehouses/[id] - Get warehouse by ID
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// Rate limiting
		const clientId = getClientIdentifier(request);
		if (!checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW)) {
			return errorResponse("Rate limit exceeded", 429);
		}

		const { id } = await params;

		// Validate UUID format
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(id)) {
			return errorResponse("Invalid warehouse ID format", 400);
		}

		// Get authenticated user and company
		const { createClient } = await import("@/lib/supabaseServer");
		const supabase = await createClient();

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return errorResponse("Authentication required", 401);
		}

		const { data: companyUser } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.single();

		if (!companyUser?.companyId) {
			return errorResponse("No company associated with user", 403);
		}

		const { data: warehouse, error: queryError } = await supabase
			.from("company_locations")
			.select("*")
			.eq("id", id)
			.eq("companyId", companyUser.companyId)
			.single();

		if (queryError || !warehouse) {
			return errorResponse("Warehouse not found", 404);
		}

		return successResponse(warehouse);
	} catch (error) {
		return handleError(error);
	}
}

// PUT /api/inventory/warehouses/[id] - Update warehouse
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// Rate limiting (stricter for write operations)
		const clientId = getClientIdentifier(request);
		if (!checkRateLimit(`${clientId}:write`, 20, RATE_WINDOW)) {
			return errorResponse("Rate limit exceeded for write operations", 429);
		}

		const { id } = await params;

		// Validate UUID format
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(id)) {
			return errorResponse("Invalid warehouse ID format", 400);
		} 		// Parse request body
		const body = await request.json();

		// Authentication check
		const user = await authenticate(request);
		if (!user) {
			return errorResponse("Unauthorized", 401);
		}

		const updateInput: UpdateWarehouseInput = {
			id,
			...body,
		};

		// Update warehouse using server action (validation happens in the action)
		const result = await updateWarehouse(updateInput);

		if (!result.success) {
			return errorResponse(
				result.error!,
				result.error === "Warehouse not found" ? 404 : 400,
			);
		}

		return successResponse(result.data, result.message);
	} catch (error) {
		return handleError(error);
	}
}

// DELETE /api/inventory/warehouses/[id] - Delete warehouse
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// Rate limiting (strictest for delete operations)
		const clientId = getClientIdentifier(request);
		if (!checkRateLimit(`${clientId}:delete`, 10, RATE_WINDOW)) {
			return errorResponse("Rate limit exceeded for delete operations", 429);
		}

		const { id } = await params; // Validate UUID format
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(id)) {
			return errorResponse("Invalid warehouse ID format", 400);
		}

		// Authentication check
		const user = await authenticate(request);
		if (!user) {
			return errorResponse("Unauthorized", 401);
		}

		// Delete warehouse using server action
		const result = await deleteWarehouse(id);

		if (!result.success) {
			return errorResponse(
				result.error!,
				result.error === "Warehouse not found" ? 404 : 400,
			);
		}

		return successResponse(result.data, result.message);
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
			"Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
