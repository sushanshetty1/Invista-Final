import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get user's company
		const { data: companyUser } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.single();

		if (!companyUser?.companyId) {
			return NextResponse.json(
				{ error: "No company associated with user" },
				{ status: 403 },
			);
		}

		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get("limit") || "50");
		const offset = parseInt(searchParams.get("offset") || "0");
		const search = searchParams.get("search") || "";

		let query = supabase
			.from("company_locations")
			.select("*", { count: "exact" })
			.eq("companyId", companyUser.companyId)
			.order("name", { ascending: true })
			.range(offset, offset + limit - 1);

		if (search) {
			query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
		}

		const { data: locations, error, count } = await query;

		if (error) {
			throw error;
		}

		return NextResponse.json({
			warehouses: locations || [],
			total: count || 0,
			hasMore: offset + limit < (count || 0),
		});
	} catch (error) {
		console.error("Error fetching warehouses:", error);
		console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
		const errorMessage = error instanceof Error ? error.message : "Failed to fetch warehouses";
		return NextResponse.json(
			{ error: "Failed to fetch warehouses", details: errorMessage },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get user's company
		const { data: companyUser } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.single();

		if (!companyUser?.companyId) {
			return NextResponse.json(
				{ error: "No company associated with user" },
				{ status: 403 },
			);
		}

		const body = await request.json();
		const {
			name,
			code,
			address,
			phone,
			email,
			type = "STANDARD",
			managerName,
			managerEmail,
			managerPhone,
		} = body;

		// Validate required fields
		if (!name || !code) {
			return NextResponse.json(
				{ error: "Name and code are required" },
				{ status: 400 },
			);
		}

		// Check if warehouse code already exists for this company
		if (code) {
			const { data: existing } = await supabase
				.from("company_locations")
				.select("id")
				.eq("companyId", companyUser.companyId)
				.eq("code", code)
				.single();

			if (existing) {
				return NextResponse.json(
					{ error: "Warehouse code already exists" },
					{ status: 400 },
				);
			}
		}

		const { data: warehouse, error: createError } = await supabase
			.from("company_locations")
			.insert({
				name,
				code,
				address: address || {},
				phone,
				email,
				type: type || "WAREHOUSE",
				managerName,
				companyId: companyUser.companyId,
				isActive: true,
			})
			.select()
			.single();

		if (createError) {
			throw createError;
		}

		return NextResponse.json(warehouse, { status: 201 });
	} catch (error) {
		console.error("Error creating warehouse:", error);
		return NextResponse.json(
			{ error: "Failed to create warehouse" },
			{ status: 500 },
		);
	}
}
