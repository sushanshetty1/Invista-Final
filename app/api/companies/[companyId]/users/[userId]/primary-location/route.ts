import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// PUT /api/companies/[companyId]/users/[userId]/primary-location - Set user's primary location
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ companyId: string; userId: string }> },
) {
	try {
		const { companyId, userId } = await params;
		const body = await request.json();

		const { locationId } = body;

		if (!locationId) {
			return NextResponse.json(
				{ success: false, error: "Location ID is required" },
				{ status: 400 },
			);
		}

		// Verify location exists and belongs to the company
		const { data: location, error: locationError } = await supabase
			.from("company_locations")
			.select("id")
			.eq("id", locationId)
			.eq("companyId", companyId)
			.eq("isActive", true)
			.single();

		if (locationError || !location) {
			return NextResponse.json(
				{ success: false, error: "Location not found or inactive" },
				{ status: 404 },
			);
		}

		// First check if the company user record exists
		const { error: userCheckError } = await supabase
			.from("company_users")
			.select("id, companyId, userId")
			.eq("companyId", companyId)
			.eq("userId", userId)
			.single();

		if (userCheckError) {
			console.error("User not found in company:", {
				companyId,
				userId,
				error: userCheckError,
			});
			return NextResponse.json(
				{ success: false, error: "User not found in company" },
				{ status: 404 },
			);
		}

		// Update user's primary location
		const { data: updatedUser, error: updateError } = await supabase
			.from("company_users")
			.update({ primaryLocationId: locationId })
			.eq("companyId", companyId)
			.eq("userId", userId)
			.select()
			.single();

		if (updateError) {
			console.error("Error updating primary location:", updateError);
			throw updateError;
		}

		// Ensure user has access to their primary location
		const { data: existingAccess, error: accessCheckError } = await supabase
			.from("user_location_access")
			.select("id")
			.eq("userId", userId)
			.eq("companyId", companyId)
			.eq("locationId", locationId)
			.maybeSingle(); // Use maybeSingle instead of single to handle 0 or 1 results

		// If there's an error other than no results, throw it
		if (accessCheckError && accessCheckError.code !== "PGRST116") {
			console.error("Error checking location access:", accessCheckError);
			throw accessCheckError;
		}

		if (!existingAccess) {
			const { error: insertError } = await supabase
				.from("user_location_access")
				.insert({
					userId,
					companyId,
					locationId,
					accessLevel: "STANDARD",
					canManage: false,
					grantedAt: new Date().toISOString(),
				});

			if (insertError) {
				console.error("Error granting location access:", insertError);
				throw insertError;
			}
		}

		return NextResponse.json({
			success: true,
			data: updatedUser,
		});
	} catch (error) {
		const { companyId, userId } = await params;
		console.error("Error setting primary location:", {
			error,
			companyId,
			userId,
		});
		return NextResponse.json(
			{ success: false, error: "Failed to set primary location" },
			{ status: 500 },
		);
	}
}

// GET /api/companies/[companyId]/users/[userId]/primary-location - Get user's primary location
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ companyId: string; userId: string }> },
) {
	try {
		const { companyId, userId } = await params;

		const { data: companyUser, error } = await supabase
			.from("company_users")
			.select(`
        primaryLocationId,
        primaryLocation:company_locations!primaryLocationId (
          id,
          name,
          type,
          address,
          description
        )
      `)
			.eq("companyId", companyId)
			.eq("userId", userId)
			.single();

		if (error && error.code !== "PGRST116") {
			throw error;
		}

		return NextResponse.json({
			success: true,
			data: {
				primaryLocation: companyUser?.primaryLocation || null,
			},
		});
	} catch (error) {
		console.error("Error fetching primary location:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch primary location" },
			{ status: 500 },
		);
	}
}
