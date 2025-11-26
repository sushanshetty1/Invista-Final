import { type NextRequest, NextResponse } from "next/server";
import {
	getCustomers,
	createCustomer,
	type CreateCustomerInput,
} from "@/lib/actions/customers";
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
		const search = searchParams.get("search") || undefined;
		const limit = searchParams.get("limit")
			? parseInt(searchParams.get("limit")!)
			: undefined;

		const result = await getCustomers({
			companyId: companyUser.companyId,
			searchTerm: search,
			limit,
		});

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json({ customers: result.data });
	} catch (error) {
		console.error("Error fetching customers:", error);
		const errorMessage = error instanceof Error ? error.message : "Internal server error";
		return NextResponse.json(
			{ error: "Internal server error", details: errorMessage },
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

		const input: CreateCustomerInput = {
			companyId: companyUser.companyId,
			type: body.type,
			firstName: body.firstName,
			lastName: body.lastName,
			businessName: body.businessName || body.companyName, // Support both field names
			email: body.email,
			phone: body.phone,
			billingAddress1: body.billingAddress?.street || body.billingAddress1,
			billingAddress2: body.billingAddress2,
			billingCity: body.billingAddress?.city || body.billingCity,
			billingState: body.billingAddress?.state || body.billingState,
			billingPostalCode: body.billingAddress?.zipCode || body.billingPostalCode,
			billingCountry: body.billingAddress?.country || body.billingCountry,
			createdById: user.id,
		};

		const result = await createCustomer(input);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json(
			{ customer: result.data, message: "Customer created successfully" },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating customer:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
