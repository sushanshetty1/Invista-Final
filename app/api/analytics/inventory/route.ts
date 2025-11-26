import { type NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/prisma";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const dateRange = searchParams.get("dateRange") || "30d";
		const warehouseId = searchParams.get("warehouseId");

		// Calculate date range
		const endDate = new Date();
		const startDate = new Date();

		switch (dateRange) {
			case "7d":
				startDate.setDate(endDate.getDate() - 7);
				break;
			case "30d":
				startDate.setDate(endDate.getDate() - 30);
				break;
			case "90d":
				startDate.setDate(endDate.getDate() - 90);
				break;
			case "1y":
				startDate.setFullYear(endDate.getFullYear() - 1);
				break;
			default:
				startDate.setDate(endDate.getDate() - 30);
		}

		// Build warehouse filter for movements (via inventoryItem)
		const movementWhereClause: Record<string, unknown> = {
			occurredAt: {
				gte: startDate,
				lte: endDate,
			},
		};
		if (warehouseId && warehouseId !== "all") {
			movementWhereClause.inventoryItem = { warehouseId };
		}

		// Get stock movement data
		const movementData = await neonClient.inventoryMovement.groupBy({
			by: ["occurredAt"],
			where: movementWhereClause,
			_sum: {
				quantity: true,
			},
			_count: {
				id: true,
			},
			orderBy: {
				occurredAt: "asc",
			},
		});

		// Get ABC analysis data - using costPrice from Product since InventoryItem doesn't have averageCost
		const products = await neonClient.product.findMany({
			select: {
				id: true,
				name: true,
				costPrice: true,
				inventoryItems: {
					select: {
						quantity: true,
					},
				},
			},
		});

		// Calculate ABC analysis using product cost price
		const productValues = products
			.map((product) => {
				const totalQuantity = product.inventoryItems.reduce(
					(sum: number, item) => sum + item.quantity,
					0,
				);
				const unitCost = Number(product.costPrice || 0);
				return {
					id: product.id,
					name: product.name,
					value: totalQuantity * unitCost,
				};
			})
			.sort((a, b) => b.value - a.value);

		const totalValue = productValues.reduce((sum, p) => sum + p.value, 0);
		let cumulativeValue = 0;
		const abcAnalysis = productValues.map((product) => {
			cumulativeValue += product.value;
			const cumulativePercentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;

			let category = "C";
			if (cumulativePercentage <= 80) category = "A";
			else if (cumulativePercentage <= 95) category = "B";

			return {
				...product,
				category,
				cumulativePercentage,
			};
		});

		// Get inventory aging data - use product costPrice for value calculation
		const inventoryItems = await neonClient.inventoryItem.findMany({
			include: {
				product: {
					select: {
						name: true,
						sku: true,
						costPrice: true,
					},
				},
			},
		});

		const agingData = inventoryItems.map((item) => {
			const daysInInventory = Math.floor(
				(new Date().getTime() - new Date(item.createdAt).getTime()) /
				(1000 * 60 * 60 * 24),
			);

			let ageCategory = "0-30 days";
			if (daysInInventory > 90) ageCategory = "91+ days";
			else if (daysInInventory > 60) ageCategory = "61-90 days";
			else if (daysInInventory > 30) ageCategory = "31-60 days";

			return {
				...item,
				daysInInventory,
				ageCategory,
				value: item.quantity * Number(item.product?.costPrice || 0),
			};
		});

		// Get top moving items - use inventoryItemId to get productId from movements
		const topMovingItems = await neonClient.inventoryMovement.groupBy({
			by: ["inventoryItemId"],
			where: {
				occurredAt: {
					gte: startDate,
					lte: endDate,
				},
				type: "SHIPMENT",
			},
			_sum: {
				quantity: true,
			},
			orderBy: {
				_sum: {
					quantity: "desc",
				},
			},
			take: 10,
		});

		// Get product details for top moving items
		const topMovingItemIds = topMovingItems.map((m) => m.inventoryItemId);
		const topMovingInventoryItems = await neonClient.inventoryItem.findMany({
			where: {
				id: { in: topMovingItemIds },
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						sku: true,
					},
				},
			},
		});

		const topMovingWithDetails = topMovingItems.map((item) => {
			const inventoryItem = topMovingInventoryItems.find(
				(inv) => inv.id === item.inventoryItemId
			);
			return {
				...item,
				product: inventoryItem?.product,
			};
		});

		// Get slow moving items - products with no recent shipment movements
		// First, get all product IDs that have had recent shipments
		const recentShipments = await neonClient.inventoryMovement.findMany({
			where: {
				type: "SHIPMENT",
				occurredAt: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
				},
			},
			select: {
				inventoryItem: {
					select: {
						productId: true,
					},
				},
			},
		});

		const activeProductIds = [
			...new Set(recentShipments.map((s) => s.inventoryItem.productId)),
		];

		// Get products that have NOT had recent shipments
		const slowMovingItems = await neonClient.product.findMany({
			where: {
				id: {
					notIn: activeProductIds,
				},
			},
			select: {
				id: true,
				name: true,
				sku: true,
				inventoryItems: {
					select: {
						quantity: true,
					},
				},
			},
			take: 10,
		});

		return NextResponse.json({
			success: true,
			data: {
				movementData,
				abcAnalysis: {
					categories: [
						{
							category: "A (High Value)",
							items: abcAnalysis.filter((p) => p.category === "A").length,
							percentage: 20,
							value: abcAnalysis
								.filter((p) => p.category === "A")
								.reduce((sum, p) => sum + p.value, 0),
						},
						{
							category: "B (Medium Value)",
							items: abcAnalysis.filter((p) => p.category === "B").length,
							percentage: 30,
							value: abcAnalysis
								.filter((p) => p.category === "B")
								.reduce((sum, p) => sum + p.value, 0),
						},
						{
							category: "C (Low Value)",
							items: abcAnalysis.filter((p) => p.category === "C").length,
							percentage: 50,
							value: abcAnalysis
								.filter((p) => p.category === "C")
								.reduce((sum, p) => sum + p.value, 0),
						},
					],
				},
				agingData: ["0-30 days", "31-60 days", "61-90 days", "91+ days"].map(
					(range) => ({
						range,
						quantity: agingData.filter((item) => item.ageCategory === range)
							.length,
						value: agingData
							.filter((item) => item.ageCategory === range)
							.reduce((sum, item) => sum + item.value, 0),
						percentage:
							agingData.length > 0
								? (agingData.filter((item) => item.ageCategory === range).length /
									agingData.length) *
								100
								: 0,
					}),
				),
				topMovingItems: topMovingWithDetails,
				slowMovingItems,
			},
		});
	} catch (error) {
		console.error("Inventory analytics API error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch inventory analytics" },
			{ status: 500 },
		);
	}
}
