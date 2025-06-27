import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db";
import { INDUSTRY_CATEGORIES } from "@/lib/industry-categories";

export async function GET(request: NextRequest) {
	try {
		console.log("🔍 Test Industry categories API called - bypassing auth");

		// Test with the known user ID from your database
		const userId = "c99e948b-bd45-4df9-8804-76d6ec25cde6";
		console.log("👤 Using test User ID:", userId);

		// Find the user's company through company_users table
		console.log("🔍 Querying company_users table...");
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

		console.log("🏢 Company user data:", JSON.stringify(companyUser, null, 2));

		if (!companyUser?.company) {
			console.error("❌ No company found for user:", userId);
			return NextResponse.json(
				{
					error: "No company found for user",
					categories: [],
					industry: null,
					debug: { userId, companyUser },
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
					debug: { userId, companyUser },
				},
				{ status: 200 },
			);
		}

		// Get categories for this industry
		const categories =
			INDUSTRY_CATEGORIES[industry as keyof typeof INDUSTRY_CATEGORIES] || [];
		console.log(
			`📋 Found ${categories.length} categories for ${industry} industry`,
		);

		return NextResponse.json({
			categories,
			industry,
			companyId: companyUser.company.id,
			companyName: companyUser.company.name,
			debug: {
				userId,
				companyUser: {
					userId: companyUser.userId,
					companyId: companyUser.companyId,
					company: companyUser.company,
				},
			},
		});
	} catch (error) {
		console.error("💥 Error in test industry categories API:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				categories: [],
				industry: null,
			},
			{ status: 500 },
		);
	}
}
