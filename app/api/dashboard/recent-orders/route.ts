import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
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

		const searchParams = request.nextUrl.searchParams;
		const limit = parseInt(searchParams.get("limit") || "5");

		// Fetch recent orders
		const orders = await neonClient.order.findMany({
			where: {
				companyId,
			},
			select: {
				id: true,
				orderNumber: true,
				totalAmount: true,
				status: true,
				createdAt: true,
				customerId: true,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		});

		// Fetch customer details separately
		const customerIds = [...new Set(orders.map(o => o.customerId))];
		const customers = customerIds.length > 0
			? await neonClient.customer.findMany({
				where: { id: { in: customerIds } },
				select: {
					id: true,
					firstName: true,
					lastName: true,
					businessName: true,
					email: true,
				},
			})
			: [];
		const customerMap = new Map(customers.map(c => [c.id, c]));

		const formattedOrders = orders.map((order) => {
			const customer = customerMap.get(order.customerId);
			return {
				id: order.orderNumber || order.id,
				customer: customer?.businessName ||
					(customer?.firstName && customer?.lastName
						? `${customer.firstName} ${customer.lastName}`
						: customer?.firstName || customer?.lastName || "Guest Customer"),
				amount: Number(order.totalAmount || 0),
				status: order.status.toLowerCase(),
				date: order.createdAt.toISOString().split("T")[0],
			};
		});

		return NextResponse.json(formattedOrders);
	} catch (error) {
		console.error("Recent orders API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
