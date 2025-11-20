import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({
				error: "Not authenticated",
				details: authError?.message,
			}, { status: 401 });
		}

		// Check company_users
		const { data: companyUsers, error: companyUsersError } = await supabaseAdmin
			.from("company_users")
			.select("*")
			.eq("userId", user.id);

		// Check owned companies
		const { data: ownedCompanies, error: ownedError } = await supabaseAdmin
			.from("companies")
			.select("*")
			.eq("createdBy", user.id);

		return NextResponse.json({
			userId: user.id,
			email: user.email,
			companyUsers: {
				data: companyUsers,
				error: companyUsersError?.message,
			},
			ownedCompanies: {
				data: ownedCompanies,
				error: ownedError?.message,
			},
		});
	} catch (error) {
		console.error("Debug endpoint error:", error);
		return NextResponse.json({
			error: "Internal server error",
			details: error instanceof Error ? error.message : String(error),
		}, { status: 500 });
	}
}
