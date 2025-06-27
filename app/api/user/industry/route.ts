import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { supabaseClient } from "@/lib/db";
import { getIndustryCategories } from "@/lib/industry-categories";

export async function GET(request: NextRequest) {
	try {
		// Check authentication header
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const token = authHeader.split(" ")[1];

		// Verify the token with Supabase
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser(token);
		if (authError || !user) {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const userId = user.id;

		// Get user's company industry through the database
		const companyUser = await supabaseClient.companyUser.findFirst({
			where: {
				userId: userId,
			},
			include: {
				company: {
					select: {
						industry: true,
					},
				},
			},
		});

		if (!companyUser?.company?.industry) {
			return NextResponse.json({
				industry: null,
				categories: [],
				message: "No company industry found for user",
			});
		}

		const industry = companyUser.company.industry;
		const categories = getIndustryCategories(industry);

		return NextResponse.json({
			industry,
			categories,
		});
	} catch (error) {
		console.error("Error fetching user industry:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
