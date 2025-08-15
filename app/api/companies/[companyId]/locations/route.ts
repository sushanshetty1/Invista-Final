import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { randomUUID } from "crypto";

// GET /api/companies/[companyId]/locations - Get all locations for a company
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ companyId: string }> },
) {
	try {
		const { companyId } = await params;

		// Get locations from Supabase
		const { data: locations, error } = await supabase
			.from("company_locations")
			.select("*")
			.eq("companyId", companyId)
			.eq("isActive", true)
			.order("isPrimary", { ascending: false })
			.order("name", { ascending: true });

		if (error) {
			throw error;
		}

		return NextResponse.json({
			success: true,
			data: locations || [],
		});
	} catch (error) {
		console.error("Error fetching company locations:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch locations" },
			{ status: 500 },
		);
	}
}

// POST /api/companies/[companyId]/locations - Create a new location
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ companyId: string }> },
) {
	try {
		const { companyId } = await params;
		const body = await request.json();

		const {
			name,
			description,
			code,
			type,
			address,
			coordinates,
			timezone = "UTC",
			phone,
			email,
			managerName,
			managerUserId,
			businessHours,
			capacity,
			features,
			storeFormat,
			salesChannels,
			allowsInventory = true,
			allowsOrders = true,
			allowsReturns = true,
			allowsTransfers = true,
			isPrimary = false,
		} = body; // Validate company exists
		const { data: company, error: companyError } = await supabase
			.from("companies")
			.select("id")
			.eq("id", companyId)
			.eq("isActive", true)
			.single();

		if (companyError || !company) {
			return NextResponse.json(
				{ success: false, error: "Company not found or inactive" },
				{ status: 404 },
			);
		}

		// Validate required fields
		if (!name || !type) {
			return NextResponse.json(
				{ success: false, error: "Name and type are required" },
				{ status: 400 },
			);
		}

		// Validate location type
		const validTypes = [
			"OFFICE",
			"WAREHOUSE",
			"STORE",
			"DISTRIBUTION_CENTER",
			"MANUFACTURING",
		];
		if (!validTypes.includes(type)) {
			return NextResponse.json(
				{
					success: false,
					error: `Invalid location type. Must be one of: ${validTypes.join(", ")}`,
				},
				{ status: 400 },
			);
		}

		// Validate code uniqueness if provided
		if (code) {
			const { data: existingLocation } = await supabase
				.from("company_locations")
				.select("id")
				.eq("companyId", companyId)
				.eq("code", code)
				.single();

			if (existingLocation) {
				return NextResponse.json(
					{
						success: false,
						error: "Location code already exists for this company",
					},
					{ status: 409 },
				);
			}
		} // Validate email format if provided
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return NextResponse.json(
				{ success: false, error: "Invalid email format" },
				{ status: 400 },
			);
		}

		// Validate coordinates format if provided
		if (coordinates && (!coordinates.latitude || !coordinates.longitude)) {
			return NextResponse.json(
				{
					success: false,
					error: "Coordinates must include both latitude and longitude",
				},
				{ status: 400 },
			);
		}

		// Create location in Supabase
		const { data: location, error } = await supabase
			.from("company_locations")
			.insert({
				id: randomUUID(), // Explicitly generate UUID
				companyId,
				name,
				description,
				code,
				type,
				address,
				coordinates,
				timezone,
				phone,
				email,
				managerName,
				managerUserId,
				businessHours,
				capacity,
				features,
				storeFormat,
				salesChannels,
				allowsInventory,
				allowsOrders,
				allowsReturns,
				allowsTransfers,
				isPrimary,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
			.select()
			.single();

		if (error) {
			throw error;
		}

		return NextResponse.json({
			success: true,
			data: location,
		});
	} catch (error: unknown) {
		console.error("Error creating company location:", error);

		// Handle specific database errors
		if (typeof error === 'object' && error !== null && 'code' in error) {
			const dbError = error as { code: string; message?: string; meta?: { target?: string[] } };
			const errorMessage = dbError.message || 'Unknown database error';
			switch (dbError.code) {
				case "23502": // NOT NULL violation
					return NextResponse.json(
						{
							success: false,
							error: "Missing required field",
							details: errorMessage,
						},
						{ status: 400 },
					);
				case "23505": // Unique constraint violation
					return NextResponse.json(
						{
							success: false,
							error: "Location code or name already exists",
							details: errorMessage,
						},
						{ status: 409 },
					);
				case "23503": // Foreign key violation
					return NextResponse.json(
						{
							success: false,
							error: "Invalid company ID or reference",
							details: errorMessage,
						},
						{ status: 400 },
					);
				default:
					return NextResponse.json(
						{ success: false, error: "Database error", details: errorMessage },
						{ status: 500 },
					);
			}
		}

		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create company location",
				details: errorMessage,
			},
			{ status: 500 },
		);
	}
}
