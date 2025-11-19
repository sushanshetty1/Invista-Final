import { type NextRequest, NextResponse } from "next/server";
import {
	getCustomers,
	createCustomer,
	type CreateCustomerInput,
} from "@/lib/actions/customers";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const search = searchParams.get("search") || undefined;
		const limit = searchParams.get("limit")
			? parseInt(searchParams.get("limit")!)
			: undefined;

		const result = await getCustomers({
			searchTerm: search,
			limit,
		});

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		return NextResponse.json({ customers: result.data });
	} catch (error) {
		console.error("Error fetching customers:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session?.user?.id) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const user = session.user;

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
			companyName: body.companyName,
			taxId: body.taxId,
			email: body.email,
			phone: body.phone,
			mobile: body.mobile,
			billingAddress: body.billingAddress,
			shippingAddress: body.shippingAddress,
			creditLimit: body.creditLimit,
			paymentTerms: body.paymentTerms,
			currency: body.currency,
			notes: body.notes,
			createdBy: user.id,
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
