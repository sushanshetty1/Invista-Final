import { type NextRequest, NextResponse } from "next/server";
import {
	getPurchaseOrders,
	createPurchaseOrder,
} from "@/lib/actions/purchase-orders";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET /api/purchase-orders
export async function GET(request: NextRequest) {
	try {
		// Create Supabase server client to get user's company
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		
		if (!supabaseUrl || !supabaseAnonKey) {
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 },
			);
		}
		
		const cookieStore = await cookies();
		const supabase = createServerClient(
			supabaseUrl,
			supabaseAnonKey,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						);
					},
				},
			}
		);

		// Get current user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			console.error("User error in GET:", userError);
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get user's company
		const { data: companyUserData, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUserData?.companyId) {
			console.error("Company lookup error in GET:", companyError);
			return NextResponse.json(
				{ error: "User not associated with any company" },
				{ status: 403 },
			);
		}

		const searchParams = request.nextUrl.searchParams;

		const filters = {
			status: searchParams.get("status") || undefined,
			supplierId: searchParams.get("supplierId") || undefined,
			warehouseId: searchParams.get("warehouseId") || undefined,
			searchTerm: searchParams.get("search") || undefined,
			companyId: companyUserData.companyId,
		};

		const result = await getPurchaseOrders(filters);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		// Return data in the format expected by the frontend
		return NextResponse.json({ purchaseOrders: result.data });
	} catch (error) {
		console.error("Purchase Orders API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/purchase-orders
export async function POST(request: NextRequest) {
	try {
		// Create Supabase server client for authentication
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		
		if (!supabaseUrl || !supabaseAnonKey) {
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 },
			);
		}
		
		const cookieStore = await cookies();
		const supabase = createServerClient(
			supabaseUrl,
			supabaseAnonKey,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						);
					},
				},
			}
		);

		// Get current user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			console.error("User error:", userError);
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const body = await request.json();

		// Log the incoming data for debugging
		console.log("Creating purchase order with data:", JSON.stringify(body, null, 2));
		console.log("User ID:", user.id);

		const result = await createPurchaseOrder({ ...body, createdBy: user.id });

		if (!result.success) {
			console.error("Purchase order creation failed:", result.error);
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data, { status: 201 });
	} catch (error) {
		console.error("Create purchase order API error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 },
		);
	}
}
