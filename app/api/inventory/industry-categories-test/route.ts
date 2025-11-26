import { type NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/prisma";
import { getIndustryCategories } from "@/lib/industry-categories";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
	try {
		console.log("🔍 Test Industry categories API called - bypassing auth");

		// Test with the known user ID from your database
		const userId = "c99e948b-bd45-4df9-8804-76d6ec25cde6";
		console.log("👤 Using test User ID:", userId);

		// Find the user's company through company_members table
		console.log("🔍 Querying company_members table...");
		const companyMember = await supabaseClient.companyMember.findFirst({
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

		console.log("🏢 Company member data:", JSON.stringify(companyMember, null, 2));

		if (!companyMember?.company) {
			console.error("❌ No company found for user:", userId);
			return NextResponse.json(
				{
					error: "No company found for user",
					categories: [],
					industry: null,
					debug: { userId, companyMember },
				},
				{ status: 200 },
			);
		}

		const industry = companyMember.company.industry;
		console.log("🏭 Company industry:", industry);

		if (!industry) {
			console.error("❌ No industry set for company:", companyMember.company.id);
			return NextResponse.json(
				{
					error: "No industry set for company",
					categories: [],
					industry: null,
					debug: { userId, companyMember },
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
			companyId: companyMember.company.id,
			companyName: companyMember.company.name,
			debug: {
				userId,
				companyMember: {
					userId: companyMember.userId,
					companyId: companyMember.companyId,
					company: companyMember.company,
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
