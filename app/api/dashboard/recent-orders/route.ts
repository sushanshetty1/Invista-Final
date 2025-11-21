import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/db";
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
				customer: {
					select: {
						firstName: true,
						lastName: true,
						companyName: true,
						email: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		});

		const formattedOrders = orders.map((order) => ({
			id: order.orderNumber || order.id,
			customer: order.customer?.companyName || 
				(order.customer?.firstName && order.customer?.lastName 
					? `${order.customer.firstName} ${order.customer.lastName}` 
					: order.customer?.firstName || order.customer?.lastName || "Guest Customer"),
			amount: Number(order.totalAmount || 0),
			status: order.status.toLowerCase(),
			date: order.createdAt.toISOString().split("T")[0],
		}));

		return NextResponse.json(formattedOrders);
	} catch (error) {
		console.error("Recent orders API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
