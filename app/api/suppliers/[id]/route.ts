import { type NextRequest, NextResponse } from "next/server";
import { deleteSupplier, getSupplier, updateSupplier } from "@/lib/actions/suppliers";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(
	_request: NextRequest,
	context: RouteContext,
) {
	try {
		const { id } = await context.params;
		const result = await getSupplier(id);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 404 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Error fetching supplier:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	context: RouteContext,
) {
	try {
		// Create Supabase server client
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
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { id } = await context.params;
		const body = await request.json();

		const result = await updateSupplier({
			id,
			...body,
		});

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(result.data);
	} catch (error) {
		console.error("Error updating supplier:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	context: RouteContext,
) {
	try {
		// Create Supabase server client
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
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const { id } = await context.params;
		const result = await deleteSupplier(id);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json({ message: "Supplier deleted successfully" });
	} catch (error) {
		console.error("Error deleting supplier:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
