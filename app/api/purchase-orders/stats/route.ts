import { NextResponse } from "next/server";
import { getPurchaseOrderStats } from "@/lib/actions/purchase-orders";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET /api/purchase-orders/stats
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
			console.error("User error in stats:", userError);
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
			console.error("Company lookup error in stats:", companyError);
			return NextResponse.json(
				{ error: "User not associated with any company" },
				{ status: 403 },
			);
		}

		const result = await getPurchaseOrderStats(companyUserData.companyId);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Purchase order stats API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
