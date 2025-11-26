/**
 * API Route: Stock Alerts Management
 *
 * Handles stock alert generation including low stock, out of stock,
 * overstock, and expiry alerts.
 */

import type { NextRequest } from "next/server";
import { neonClient } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
	try {
		// Authenticate the request
		const authResult = await authenticate(request);
		if (!authResult.success) {
			return errorResponse("Unauthorized", 401);
		}

		// Get query parameters
		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type"); // 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRING'
		const warehouseId = searchParams.get("warehouseId");
		const severity = searchParams.get("severity"); // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

		// Get all stock items
		const stockItems = await neonClient.inventoryItem.findMany({
			where: {
				...(warehouseId && { warehouseId }),
			},
			select: {
				id: true,
				productId: true,
				variantId: true,
				warehouseId: true,
				quantity: true,
				reservedQuantity: true,
				expiryDate: true,
			},
		});

		// Fetch products and warehouses separately
		const productIds = [...new Set(stockItems.map(s => s.productId))];
		const variantIds = [...new Set(stockItems.map(s => s.variantId).filter(Boolean))] as string[];
		const warehouseIds = [...new Set(stockItems.map(s => s.warehouseId))];

		const [products, variants, warehouses] = await Promise.all([
			neonClient.product.findMany({
				where: { id: { in: productIds } },
				select: {
					id: true,
					name: true,
					sku: true,
					minStock: true,
					reorderPoint: true,
				},
			}),
			variantIds.length > 0
				? neonClient.productVariant.findMany({
					where: { id: { in: variantIds } },
					select: { id: true, name: true, sku: true },
				})
				: [],
			neonClient.warehouse.findMany({
				where: { id: { in: warehouseIds } },
				select: { id: true, name: true, code: true },
			}),
		]);

		const productMap = new Map(products.map(p => [p.id, p]));
		const variantMap = new Map(variants.map(v => [v.id, v]));
		const warehouseMap = new Map(warehouses.map(w => [w.id, w]));

		const alerts: Record<string, unknown>[] = [];
		const now = new Date();

		for (const item of stockItems) {
			const product = productMap.get(item.productId);
			const variant = item.variantId ? variantMap.get(item.variantId) : null;
			const warehouse = warehouseMap.get(item.warehouseId);

			if (!product || !warehouse) continue;

			const { quantity, reservedQuantity, expiryDate } = item;
			const availableQuantity = quantity - reservedQuantity;

			// Low Stock Alert - use minStock from Product
			if (product.minStock && availableQuantity <= product.minStock) {
				const alertSeverity =
					availableQuantity === 0
						? "CRITICAL"
						: availableQuantity <= product.minStock * 0.5
							? "HIGH"
							: "MEDIUM";

				alerts.push({
					id: `low-stock-${item.id}`,
					type: availableQuantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
					severity: alertSeverity,
					productId: product.id,
					productName: product.name,
					productSku: product.sku,
					variantId: variant?.id,
					variantName: variant?.name,
					warehouseId: item.warehouseId,
					warehouseName: warehouse.name,
					currentQuantity: availableQuantity,
					minimumLevel: product.minStock,
					reorderPoint: product.reorderPoint,
					message:
						availableQuantity === 0
							? `${product.name} is out of stock in ${warehouse.name}`
							: `${product.name} is running low in ${warehouse.name} (${availableQuantity} remaining)`,
					createdAt: now.toISOString(),
					requiresAction: true,
				});
			}

			// Expiry Alert (items expiring within 30 days)
			if (expiryDate) {
				const daysToExpiry = Math.ceil(
					(new Date(expiryDate).getTime() - now.getTime()) /
					(1000 * 60 * 60 * 24),
				);

				if (daysToExpiry <= 30 && daysToExpiry >= 0) {
					const alertSeverity =
						daysToExpiry <= 7
							? "CRITICAL"
							: daysToExpiry <= 14
								? "HIGH"
								: "MEDIUM";

					alerts.push({
						id: `expiring-${item.id}`,
						type: "EXPIRING",
						severity: alertSeverity,
						productId: product.id,
						productName: product.name,
						productSku: product.sku,
						variantId: variant?.id,
						variantName: variant?.name,
						warehouseId: item.warehouseId,
						warehouseName: warehouse.name,
						currentQuantity: quantity,
						expiryDate: expiryDate,
						daysToExpiry,
						message: `${product.name} in ${warehouse.name} expires in ${daysToExpiry} days`,
						createdAt: now.toISOString(),
						requiresAction: daysToExpiry <= 14,
					});
				}
			}
		}

		// Filter alerts based on query parameters
		let filteredAlerts = alerts;

		if (type) {
			filteredAlerts = filteredAlerts.filter((alert) => alert.type === type);
		}

		if (severity) {
			filteredAlerts = filteredAlerts.filter(
				(alert) => alert.severity === severity,
			);
		} // Sort by severity and creation date
		const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
		filteredAlerts.sort((a, b) => {
			const severityDiff =
				(severityOrder[b.severity as keyof typeof severityOrder] || 0) -
				(severityOrder[a.severity as keyof typeof severityOrder] || 0);
			if (severityDiff !== 0) return severityDiff;
			return (
				new Date((b.createdAt as string) || "1970-01-01").getTime() -
				new Date((a.createdAt as string) || "1970-01-01").getTime()
			);
		});

		return successResponse({
			alerts: filteredAlerts,
			summary: {
				total: filteredAlerts.length,
				critical: filteredAlerts.filter((a) => a.severity === "CRITICAL")
					.length,
				high: filteredAlerts.filter((a) => a.severity === "HIGH").length,
				medium: filteredAlerts.filter((a) => a.severity === "MEDIUM").length,
				low: filteredAlerts.filter((a) => a.severity === "LOW").length,
				byType: {
					LOW_STOCK: filteredAlerts.filter((a) => a.type === "LOW_STOCK")
						.length,
					OUT_OF_STOCK: filteredAlerts.filter((a) => a.type === "OUT_OF_STOCK")
						.length,
					OVERSTOCK: filteredAlerts.filter((a) => a.type === "OVERSTOCK")
						.length,
					EXPIRING: filteredAlerts.filter((a) => a.type === "EXPIRING").length,
				},
			},
		});
	} catch (error) {
		console.error("Stock alerts API error:", error);
		return errorResponse("Internal server error", 500);
	}
}
