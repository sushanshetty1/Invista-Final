import { type NextRequest, NextResponse } from "next/server";
import { getSuppliers, createSupplier } from "@/lib/actions/suppliers";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

		const { searchParams } = new URL(request.url);
		const search = searchParams.get("search") || undefined;
		const pageParam = searchParams.get("page");
		const page = pageParam ? parseInt(pageParam) : 1;
		const limitParam = searchParams.get("limit");
		const limit = limitParam ? parseInt(limitParam) : 50;

		const result = await getSuppliers({
			page,
			limit,
			search,
			sortBy: "name",
			sortOrder: "asc",
		});

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		// result.data already contains { suppliers, pagination }
		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Error fetching suppliers:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Create Supabase server client with cookies for server-side auth
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseAnonKey) {
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 },
			);
		}

		// Get cookie store
		const cookieStore = await cookies();

		// Create Supabase client using SSR pattern (same as middleware)
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

		// Get current user from the session
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

		console.log("Authenticated user ID:", user.id);

		// Get user's company from company_users table (dual DB setup - Supabase has company_users)
		const { data: companyUserData, error: companyError } = await supabase
			.from("company_users")
			.select("companyId, role, isActive")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUserData?.companyId) {
			console.error("Company lookup error:", companyError);
			return NextResponse.json(
				{ error: "User not associated with any company" },
				{ status: 403 },
			);
		}

		console.log("Company ID:", companyUserData.companyId);

		// Parse request body
		const body = await request.json();

		// Create supplier with company and user context (stored in Neon DB)
		const result = await createSupplier({
			...body,
			companyId: companyUserData.companyId,
			userId: user.id,
			createdBy: user.id,
		});

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data, { status: 201 });
	} catch (error) {
		console.error("Error creating supplier:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 },
		);
	}
}
