import { type NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { supabaseClient } from "@/lib/db";
import { getIndustryCategories } from "@/lib/industry-categories";

export async function GET(request: NextRequest) {
	try {
		console.log("🔍 Industry categories API called");
		console.log(
			"📋 Request headers:",
			Object.fromEntries(request.headers.entries()),
		);

		// Authenticate the user
		const authResult = await authenticate(request);
		console.log("🔐 Auth result:", authResult);

		if (!authResult.success || !authResult.user?.id) {
			console.error("❌ Authentication failed:", authResult.error);
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const userId = authResult.user.id;
		console.log("👤 User ID:", userId);

		// Find the user's company through company_users table
		const companyUser = await supabaseClient.companyUser.findFirst({
			where: {
				userId: userId,
			},
			include: {
				company: {
					select: {
						id: true,
						industry: true,
						name: true,
					},
				},
			},
		});

		console.log("🏢 Company user data:", companyUser);

		if (!companyUser?.company) {
			console.error("❌ No company found for user:", userId);
			return NextResponse.json(
				{
					error: "No company found for user",
					categories: [],
					industry: null,
				},
				{ status: 200 },
			);
		}

		const industry = companyUser.company.industry;
		console.log("🏭 Company industry:", industry);

		if (!industry) {
			console.error("❌ No industry set for company:", companyUser.company.id);
			return NextResponse.json(
				{
					error: "No industry set for company",
					categories: [],
					industry: null,
				},
				{ status: 200 },
			);
		}

		// Get categories for this industry
		const categories = getIndustryCategories(industry);
		console.log(
			`📋 Found ${categories.length} categories for ${industry} industry`,
		);

		return NextResponse.json({
			categories,
			industry,
			companyId: companyUser.company.id,
			companyName: companyUser.company.name,
		});
	} catch (error) {
		console.error("💥 Error in industry categories API:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
				categories: [],
				industry: null,
			},
			{ status: 500 },
		);
	}
}
