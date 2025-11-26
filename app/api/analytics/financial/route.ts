import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const dateRange = searchParams.get("dateRange") || "6m";

		// Calculate date range
		const endDate = new Date();
		const startDate = new Date();

		switch (dateRange) {
			case "3m":
				startDate.setMonth(endDate.getMonth() - 3);
				break;
			case "6m":
				startDate.setMonth(endDate.getMonth() - 6);
				break;
			case "1y":
				startDate.setFullYear(endDate.getFullYear() - 1);
				break;
			case "2y":
				startDate.setFullYear(endDate.getFullYear() - 2);
				break;
			default:
				startDate.setMonth(endDate.getMonth() - 6);
		}

		// Get inventory valuation data
		const inventoryItems = await neonClient.inventoryItem.findMany({
			include: {
				product: {
					select: {
						name: true,
						sku: true,
						costPrice: true,
						categoryId: true,
					},
				},
			},
		});

		// Calculate total inventory value using product costPrice
		const totalInventoryValue = inventoryItems.reduce((sum: number, item) => {
			const cost = Number(item.product.costPrice || 0);
			return sum + item.quantity * cost;
		}, 0);

		// Get sales and COGS data from order items
		const orderItems = await neonClient.orderItem.findMany({
			where: {
				orderId: {
					not: undefined,
				},
			},
			include: {
				product: {
					select: {
						costPrice: true,
						categoryId: true,
						category: {
							select: {
								name: true,
							},
						},
					},
				},
			},
		});

		// Get orders separately for date filtering
		const orders = await neonClient.order.findMany({
			where: {
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			select: {
				id: true,
				createdAt: true,
				status: true,
			},
		});

		const orderMap = new Map(orders.map((o) => [o.id, o]));

		// Calculate COGS and revenue by month
		const monthlyData: { [key: string]: { revenue: number; cogs: number } } =
			{};

		orderItems.forEach((item) => {
			const order = orderMap.get(item.orderId);
			if (order) {
				const month = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
				if (!monthlyData[month]) {
					monthlyData[month] = { revenue: 0, cogs: 0 };
				}

				const itemRevenue = Number(item.unitPrice) * item.orderedQty;
				const itemCogs = Number(item.product.costPrice || 0) * item.orderedQty;

				monthlyData[month].revenue += itemRevenue;
				monthlyData[month].cogs += itemCogs;
			}
		});

		// Get profit margin by category
		const categoryData: { [key: string]: { revenue: number; cogs: number } } =
			{};

		orderItems.forEach((item) => {
			const order = orderMap.get(item.orderId);
			if (order && item.product.category?.name) {
				const categoryName = item.product.category.name;
				if (!categoryData[categoryName]) {
					categoryData[categoryName] = { revenue: 0, cogs: 0 };
				}

				const itemRevenue = Number(item.unitPrice) * item.orderedQty;
				const itemCogs = Number(item.product.costPrice || 0) * item.orderedQty;

				categoryData[categoryName].revenue += itemRevenue;
				categoryData[categoryName].cogs += itemCogs;
			}
		});

		// Get purchase order data for purchase vs sales analysis
		const purchaseOrders = await neonClient.purchaseOrder.findMany({
			where: {
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			include: {
				items: {
					select: {
						orderedQty: true,
						unitCost: true,
					},
				},
			},
		});
		const purchasesByMonth: { [key: string]: number } = {};

		purchaseOrders.forEach((po) => {
			const month = new Date(po.createdAt).toISOString().slice(0, 7);
			const totalPurchase = po.items.reduce((sum: number, item) => {
				return sum + Number(item.unitCost) * item.orderedQty;
			}, 0);

			purchasesByMonth[month] = (purchasesByMonth[month] || 0) + totalPurchase;
		});

		// Format response data
		const cogsData = Object.entries(monthlyData).map(([month, data]) => ({
			month: new Date(month + "-01").toLocaleDateString("en-US", {
				month: "short",
			}),
			cogs: data.cogs,
			revenue: data.revenue,
			margin:
				data.revenue > 0
					? ((data.revenue - data.cogs) / data.revenue) * 100
					: 0,
		}));

		const profitMarginData = Object.entries(categoryData).map(
			([category, data]) => ({
				category,
				revenue: data.revenue,
				cogs: data.cogs,
				margin:
					data.revenue > 0
						? ((data.revenue - data.cogs) / data.revenue) * 100
						: 0,
			}),
		);

		const purchaseVsSalesData = Object.entries(monthlyData).map(
			([month, data]) => ({
				month: new Date(month + "-01").toLocaleDateString("en-US", {
					month: "short",
				}),
				purchases: purchasesByMonth[month] || 0,
				sales: data.revenue,
				ratio:
					data.revenue > 0 ? data.revenue / (purchasesByMonth[month] || 1) : 0,
			}),
		);

		// Calculate key metrics
		const totalRevenue = Object.values(monthlyData).reduce(
			(sum, data) => sum + data.revenue,
			0,
		);
		const totalCogs = Object.values(monthlyData).reduce(
			(sum, data) => sum + data.cogs,
			0,
		);
		const grossMargin =
			totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;
		const inventoryROI =
			totalRevenue > 0 && totalInventoryValue > 0
				? (totalRevenue / totalInventoryValue) * 100
				: 0;

		return NextResponse.json({
			success: true,
			data: {
				totalInventoryValue,
				grossMargin,
				totalCogs,
				inventoryROI,
				cogsData,
				profitMarginData,
				purchaseVsSalesData,
				inventoryValuation: {
					fifo: totalInventoryValue * 1.02, // Mock FIFO calculation
					lifo: totalInventoryValue * 0.98, // Mock LIFO calculation
					weighted: totalInventoryValue, // Use actual as weighted average
				},
			},
		});
	} catch (error) {
		console.error("Financial analytics API error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch financial analytics" },
			{ status: 500 },
		);
	}
}
