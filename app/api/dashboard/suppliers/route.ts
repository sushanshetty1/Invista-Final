import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/db";
import { createClient } from "@/lib/supabaseServer";

export async function GET(_request: NextRequest) {
	try {
		// Get current user session from server-side Supabase client
		const supabase = await createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user?.id) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get user's company ID from company_users table
		const { data: companyUser, error: companyError } = await supabase
			.from("company_users")
			.select("companyId")
			.eq("userId", user.id)
			.eq("isActive", true)
			.single();

		if (companyError || !companyUser?.companyId) {
			return NextResponse.json(
				{ error: "User not associated with a company" },
				{ status: 400 },
			);
		}

		const companyId = companyUser.companyId;

		// Fetch supplier performance data
		const suppliers = await neonClient.supplier.findMany({
			where: {
				companyId,
				status: "ACTIVE",
			},
			select: {
				id: true,
				name: true,
				onTimeDelivery: true,
				qualityRating: true,
				rating: true,
				_count: {
					select: {
						purchaseOrders: true,
					},
				},
			},
			orderBy: {
				rating: "desc",
			},
			take: 10,
		});

		const formattedSuppliers = suppliers.map((supplier) => ({
			name: supplier.name,
			orders: supplier._count.purchaseOrders,
			reliability: Number(supplier.onTimeDelivery || 95),
			rating: Number(supplier.rating || 4.5),
		}));

		return NextResponse.json(formattedSuppliers);
	} catch (error) {
		console.error("Suppliers API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
