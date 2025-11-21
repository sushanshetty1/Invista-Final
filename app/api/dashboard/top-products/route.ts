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

		// Fetch top selling products based on order items
		const topProducts = await neonClient.$queryRaw<
			Array<{
				id: string;
				name: string;
				totalSales: bigint;
				totalRevenue: number;
				stock: bigint;
			}>
		>`
			SELECT 
				p.id,
				p.name,
				COUNT(DISTINCT oi."orderId") as "totalSales",
				SUM(oi.quantity * oi."unitPrice") as "totalRevenue",
				COALESCE(SUM(ii."availableQuantity"), 0) as stock
			FROM "products" p
			LEFT JOIN "order_items" oi ON p.id = oi."productId"
			LEFT JOIN "orders" o ON oi."orderId" = o.id
			LEFT JOIN "inventory_items" ii ON p.id = ii."productId"
			WHERE p."companyId" = ${companyId}
			AND p.status = 'ACTIVE'
			AND o."createdAt" >= NOW() - INTERVAL '30 days'
			GROUP BY p.id, p.name
			HAVING COUNT(DISTINCT oi."orderId") > 0
			ORDER BY "totalRevenue" DESC
			LIMIT ${limit}
		`;

		const formattedProducts = topProducts.map((product, index) => ({
			id: product.id,
			name: product.name,
			sales: Number(product.totalSales || 0),
			revenue: Number(product.totalRevenue || 0),
			stock: Number(product.stock || 0),
			trend: index < topProducts.length / 2 ? "up" : "down",
		}));

		return NextResponse.json(formattedProducts);
	} catch (error) {
		console.error("Top products API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
