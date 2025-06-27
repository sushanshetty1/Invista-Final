import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET /api/companies/[companyId]/users/[userId]/location-access - Get user's location access
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ companyId: string; userId: string }> },
) {
	try {
		const { companyId, userId } = await params;

		// Get user's location access using Supabase
		const { data: userAccess, error: accessError } = await supabase
			.from("user_location_access")
			.select(`
        *,
        location:company_locations!location_id (
          id,
          name,
          type,
          address,
          isActive
        )
      `)
			.eq("userId", userId)
			.eq("companyId", companyId)
			.eq("isActive", true)
			.order("grantedAt", { ascending: false });

		if (accessError) {
			throw accessError;
		}

		// Get user's primary location from company_users
		const { data: companyUser, error: userError } = await supabase
			.from("company_users")
			.select(`
        primaryLocationId,
        primaryLocation:company_locations!primaryLocationId (
          id,
          name,
          type,
          address
        )
      `)
			.eq("companyId", companyId)
			.eq("userId", userId)
			.single();

		if (userError && userError.code !== "PGRST116") {
			throw userError;
		}

		return NextResponse.json({
			success: true,
			data: {
				primaryLocation: companyUser?.primaryLocation || null,
				locationAccess: userAccess || [],
			},
		});
	} catch (error) {
		console.error("Error fetching user location access:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch user location access" },
			{ status: 500 },
		);
	}
}

// POST /api/companies/[companyId]/users/[userId]/location-access - Grant location access
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ companyId: string; userId: string }> },
) {
	try {
		const { companyId, userId } = await params;
		const body = await request.json();

		const {
			locationId,
			accessLevel = "READ_ONLY",
			canManage = false,
			startDate = new Date().toISOString(),
			endDate,
			grantedBy,
		} = body;

		if (!locationId) {
			return NextResponse.json(
				{ success: false, error: "Location ID is required" },
				{ status: 400 },
			);
		}

		// Check if access already exists
		const { data: existingAccess } = await supabase
			.from("user_location_access")
			.select("id")
			.eq("userId", userId)
			.eq("companyId", companyId)
			.eq("locationId", locationId)
			.single();

		if (existingAccess) {
			// Update existing access
			const { data: updatedAccess, error } = await supabase
				.from("user_location_access")
				.update({
					accessLevel,
					canManage,
					startDate,
					endDate,
					isActive: true,
					grantedBy,
					grantedAt: new Date().toISOString(),
				})
				.eq("id", existingAccess.id)
				.select()
				.single();

			if (error) throw error;

			return NextResponse.json({
				success: true,
				data: updatedAccess,
			});
		} else {
			// Create new access
			const { data: newAccess, error } = await supabase
				.from("user_location_access")
				.insert({
					userId,
					companyId,
					locationId,
					accessLevel,
					canManage,
					startDate,
					endDate,
					grantedBy,
					grantedAt: new Date().toISOString(),
				})
				.select()
				.single();

			if (error) throw error;

			return NextResponse.json({
				success: true,
				data: newAccess,
			});
		}
	} catch (error) {
		console.error("Error granting location access:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to grant location access" },
			{ status: 500 },
		);
	}
}

// DELETE /api/companies/[companyId]/users/[userId]/location-access/[locationId] - Revoke location access
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ companyId: string; userId: string }> },
) {
	try {
		const { companyId, userId } = await params;
		const url = new URL(request.url);
		const locationId = url.searchParams.get("locationId");

		if (!locationId) {
			return NextResponse.json(
				{ success: false, error: "Location ID is required" },
				{ status: 400 },
			);
		}

		// Deactivate access instead of deleting
		const { data, error } = await supabase
			.from("user_location_access")
			.update({ isActive: false })
			.eq("userId", userId)
			.eq("companyId", companyId)
			.eq("locationId", locationId)
			.select();

		if (error) throw error;

		return NextResponse.json({
			success: true,
			data: { count: data?.length || 0 },
		});
	} catch (error) {
		console.error("Error revoking location access:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to revoke location access" },
			{ status: 500 },
		);
	}
}
