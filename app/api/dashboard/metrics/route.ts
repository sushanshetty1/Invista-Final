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
		const timeRange = searchParams.get("timeRange") || "7d";

		// Calculate date range based on timeRange
		const now = new Date();
		const startDate = new Date();
		const previousStartDate = new Date();

		switch (timeRange) {
			case "24h":
				startDate.setDate(now.getDate() - 1);
				previousStartDate.setDate(now.getDate() - 2);
				break;
			case "7d":
				startDate.setDate(now.getDate() - 7);
				previousStartDate.setDate(now.getDate() - 14);
				break;
			case "30d":
				startDate.setDate(now.getDate() - 30);
				previousStartDate.setDate(now.getDate() - 60);
				break;
			case "90d":
				startDate.setDate(now.getDate() - 90);
				previousStartDate.setDate(now.getDate() - 180);
				break;
			default:
				startDate.setDate(now.getDate() - 7);
				previousStartDate.setDate(now.getDate() - 14);
		}

		// Fetch metrics in parallel
		const [
			totalOrders,
			previousOrders,
			activeProducts,
			previousActiveProducts,
			revenueData,
			previousRevenueData,
		] = await Promise.all([
			// Current period orders
			neonClient.order.count({
				where: {
					companyId,
					createdAt: {
						gte: startDate,
						lte: now,
					},
				},
			}),
			// Previous period orders
			neonClient.order.count({
				where: {
					companyId,
					createdAt: {
						gte: previousStartDate,
						lt: startDate,
					},
				},
			}),
			// Active products
			neonClient.product.count({
				where: {
					companyId,
					status: "ACTIVE",
				},
			}),
			// Previous active products (approximate from a month ago)
			neonClient.product.count({
				where: {
					companyId,
					status: "ACTIVE",
					createdAt: {
						lt: startDate,
					},
				},
			}),
			// Current period revenue
			neonClient.order.aggregate({
				where: {
					companyId,
					createdAt: {
						gte: startDate,
						lte: now,
					},
					status: {
						not: "CANCELLED",
					},
				},
				_sum: {
					totalAmount: true,
				},
			}),
			// Previous period revenue
			neonClient.order.aggregate({
				where: {
					companyId,
					createdAt: {
						gte: previousStartDate,
						lt: startDate,
					},
					status: {
						not: "CANCELLED",
					},
				},
				_sum: {
					totalAmount: true,
				},
			}),
		]);

		// Calculate percentage changes
		const calculateChange = (current: number, previous: number) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		const totalRevenue = Number(revenueData._sum.totalAmount || 0);
		const previousRevenue = Number(previousRevenueData._sum.totalAmount || 0);

		// Get low stock products list
		const lowStockProductsList = await neonClient.$queryRaw<
			Array<{ count: bigint }>
		>`
			SELECT COUNT(DISTINCT i."productId") as count
			FROM "inventory_items" i
			INNER JOIN "products" p ON i."productId" = p.id
			WHERE p."companyId" = ${companyId}
			AND i."availableQuantity" <= p."minStockLevel"
			AND p."minStockLevel" > 0
		`;

		const actualLowStockCount = Number(lowStockProductsList[0]?.count || 0);

		// Get previous low stock count
		const previousLowStockList = await neonClient.$queryRaw<
			Array<{ count: bigint }>
		>`
			SELECT COUNT(DISTINCT i."productId") as count
			FROM "inventory_items" i
			INNER JOIN "products" p ON i."productId" = p.id
			WHERE p."companyId" = ${companyId}
			AND i."availableQuantity" <= p."minStockLevel"
			AND p."minStockLevel" > 0
			AND i."updatedAt" < ${startDate}
		`;

		const previousLowStockCount = Number(previousLowStockList[0]?.count || 0);

		const metrics = {
			totalRevenue: {
				current: totalRevenue,
				previous: previousRevenue,
				change: calculateChange(totalRevenue, previousRevenue),
			},
			totalOrders: {
				current: totalOrders,
				previous: previousOrders,
				change: calculateChange(totalOrders, previousOrders),
			},
			activeProducts: {
				current: activeProducts,
				previous: previousActiveProducts,
				change: calculateChange(activeProducts, previousActiveProducts),
			},
			lowStockAlerts: {
				current: actualLowStockCount,
				previous: previousLowStockCount,
				change: actualLowStockCount - previousLowStockCount,
			},
		};

		return NextResponse.json(metrics);
	} catch (error) {
		console.error("Dashboard metrics API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

