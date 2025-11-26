import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";
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

		// Fetch supplier data - these performance fields don't exist on Supplier model
		// so we'll calculate based on purchase orders
		const suppliers = await neonClient.supplier.findMany({
			where: {
				companyId,
				status: "ACTIVE",
			},
			select: {
				id: true,
				name: true,
				purchaseOrders: {
					select: {
						id: true,
						status: true,
						expectedDate: true,
						receivedDate: true,
					},
				},
			},
			take: 10,
		});

		const formattedSuppliers = suppliers.map((supplier) => {
			const orders = supplier.purchaseOrders.length;

			// Calculate on-time delivery rate from purchase orders
			const completedOrders = supplier.purchaseOrders.filter(
				po => po.status === "RECEIVED" && po.expectedDate && po.receivedDate
			);
			const onTimeOrders = completedOrders.filter(po => {
				const expected = new Date(po.expectedDate!);
				const received = new Date(po.receivedDate!);
				return received <= expected;
			});
			const reliability = completedOrders.length > 0
				? Math.round((onTimeOrders.length / completedOrders.length) * 100)
				: 95; // Default if no completed orders

			return {
				name: supplier.name,
				orders,
				reliability,
				rating: 4.5, // Default rating since it's not in schema
			};
		});

		// Sort by orders count descending
		formattedSuppliers.sort((a, b) => b.orders - a.orders);

		return NextResponse.json(formattedSuppliers);
	} catch (error) {
		console.error("Suppliers API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
