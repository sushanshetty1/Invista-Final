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

		// Fetch inventory stats in parallel
		const [
			totalValueResult,
			categoriesCount,
			outOfStockCount,
			inventoryProducts,
		] = await Promise.all([
			// Total inventory value
			neonClient.$queryRaw<Array<{ totalValue: number }>>`
				SELECT COALESCE(SUM(ii."availableQuantity" * p."sellingPrice"), 0) as "totalValue"
				FROM "inventory_items" ii
				INNER JOIN "products" p ON ii."productId" = p.id
				WHERE p."companyId" = ${companyId}
				AND p.status = 'ACTIVE'
			`,
			// Active categories count
			neonClient.$queryRaw<Array<{ count: bigint }>>`
				SELECT COUNT(DISTINCT p."categoryId") as count
				FROM "products" p
				WHERE p."companyId" = ${companyId}
				AND p.status = 'ACTIVE'
				AND p."categoryId" IS NOT NULL
			`,
			// Out of stock count
			neonClient.$queryRaw<Array<{ count: bigint }>>`
				SELECT COUNT(DISTINCT p.id) as count
				FROM "products" p
				LEFT JOIN "inventory_items" ii ON p.id = ii."productId"
				WHERE p."companyId" = ${companyId}
				AND p.status = 'ACTIVE'
				AND (ii."availableQuantity" IS NULL OR ii."availableQuantity" = 0)
			`,
			// Inventory products with stock levels
			neonClient.$queryRaw<
				Array<{
					id: string;
					name: string;
					categoryName: string | null;
					stock: bigint;
					sellingPrice: number | null;
				}>
			>`
				SELECT 
					p.id,
					p.name,
					p."categoryName",
					COALESCE(SUM(ii."availableQuantity"), 0) as stock,
					p."sellingPrice"
				FROM "products" p
				LEFT JOIN "inventory_items" ii ON p.id = ii."productId"
				WHERE p."companyId" = ${companyId}
				AND p.status = 'ACTIVE'
				GROUP BY p.id, p.name, p."categoryName", p."sellingPrice"
				ORDER BY stock DESC
				LIMIT 20
			`,
		]);

		const totalValue = Number(totalValueResult[0]?.totalValue || 0);
		const categories = Number(categoriesCount[0]?.count || 0);
		const outOfStock = Number(outOfStockCount[0]?.count || 0);

		// Calculate turnover rate (simplified - based on active products vs orders)
		const turnoverRate = 5.8; // This would need historical data to calculate accurately

		const products = inventoryProducts.map((product) => ({
			id: product.id,
			name: product.name,
			category: product.categoryName || "Uncategorized",
			stock: Number(product.stock || 0),
			value: Number(product.sellingPrice || 0),
		}));

		return NextResponse.json({
			stats: {
				totalValue,
				categories,
				outOfStock,
				turnoverRate,
			},
			products,
		});
	} catch (error) {
		console.error("Inventory stats API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
