import { type NextRequest, NextResponse } from "next/server";
import {
	getReorderSuggestions,
	createPurchaseOrderFromSuggestion,
} from "@/lib/actions/purchase-orders";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET /api/purchase-orders/reorder-suggestions
export async function GET() {
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
			console.error("User error in reorder suggestions:", userError);
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
			console.error("Company lookup error in reorder suggestions:", companyError);
			return NextResponse.json(
				{ error: "User not associated with any company" },
				{ status: 403 },
			);
		}

		const result = await getReorderSuggestions(companyUserData.companyId);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Reorder suggestions API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

// POST /api/purchase-orders/reorder-suggestions
export async function POST(request: NextRequest) {
	try {
		const suggestion = await request.json();

		const result = await createPurchaseOrderFromSuggestion(suggestion);
		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		} // TypeScript type assertion since we know result.success is true
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const successResult = result as { success: true; data: any };
		return NextResponse.json(
			{ purchaseOrder: successResult.data },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Create PO from suggestion API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
