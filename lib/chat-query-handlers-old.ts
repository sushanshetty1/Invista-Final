// Backend query handlers for live operational data
// These functions call internal APIs to get real-time data without exposing SQL

import type { IntentType } from "@/app/api/chat/classify/route";

export type QueryResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  formatted?: string;
};

/**
 * Handle inventory lookup queries
 */
export async function handleInventoryLookup(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const searchTerm = parameters.searchTerm || parameters.query || "";
    const sku = parameters.sku || "";

    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.set("searchTerm", String(searchTerm));
    if (sku) queryParams.set("sku", String(sku));

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/inventory/products?${queryParams.toString()}`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch inventory: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "No products found matching your criteria.",
      };
    }

    const formatted = formatInventoryResults(data.items);
    return { success: true, data: data.items, formatted };
  } catch (error) {
    console.error("Inventory lookup error:", error);
    return {
      success: false,
      error: "Failed to retrieve inventory data",
    };
  }
}

/**
 * Handle low stock queries
 */
export async function handleLowStockQuery(
  companyId: string
): Promise<QueryResult> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/inventory/products?lowStock=true`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch low stock items: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "Good news! No items are currently below their reorder point.",
      };
    }

    const formatted = formatLowStockResults(data.items);
    return { success: true, data: data.items, formatted };
  } catch (error) {
    console.error("Low stock query error:", error);
    return {
      success: false,
      error: "Failed to retrieve low stock data",
    };
  }
}

/**
 * Handle order status queries
 */
export async function handleOrderStatus(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const orderNumber = parameters.orderNumber || parameters.orderId || "";
    
    const queryParams = new URLSearchParams();
    if (orderNumber) queryParams.set("orderNumber", String(orderNumber));

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/orders?${queryParams.toString()}`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch order: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "No orders found matching your criteria.",
      };
    }

    const formatted = formatOrderResults(data.items);
    return { success: true, data: data.items, formatted };
  } catch (error) {
    console.error("Order status error:", error);
    return {
      success: false,
      error: "Failed to retrieve order data",
    };
  }
}

/**
 * Handle recent orders queries
 */
export async function handleRecentOrders(
  companyId: string
): Promise<QueryResult> {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const queryParams = new URLSearchParams({
      dateFrom: sevenDaysAgo.toISOString(),
      dateTo: today.toISOString(),
      limit: "20",
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/orders?${queryParams.toString()}`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch recent orders: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "No recent orders found in the last 7 days.",
      };
    }

    const formatted = formatRecentOrdersResults(data.items);
    return { success: true, data: data.items, formatted };
  } catch (error) {
    console.error("Recent orders error:", error);
    return {
      success: false,
      error: "Failed to retrieve recent orders",
    };
  }
}

/**
 * Handle recent audits queries
 */
export async function handleRecentAudits(
  companyId: string
): Promise<QueryResult> {
  try {
    return {
      success: true,
      formatted: "📋 **Recent Audits**\n\nTo view audit history and details, please visit the Audits page. You can navigate there by asking \"go to audits\" or clicking on Audits in the menu.",
    };
  } catch (error) {
    console.error("Recent audits error:", error);
    return {
      success: false,
      error: "Failed to retrieve audit data",
    };
  }
}

/**
 * Handle audit status queries  
 */
export async function handleAuditStatus(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    return {
      success: true,
      formatted: "📋 **Audit Details**\n\nFor detailed audit information, please visit the Audits page where you can view all audit reports and compliance metrics.",
    };
  } catch (error) {
    console.error("Audit status error:", error);
    return {
      success: false,
      error: "Failed to retrieve audit status",
    };
  }
}

/**
 * Handle analytics overview queries
 */
export async function handleAnalyticsOverview(
  companyId: string
): Promise<QueryResult> {
  try {
    // Call server actions directly
    const { getOrders } = await import("@/lib/actions/orders");
    
    const ordersResult = await getOrders({ limit: 100 });
    const ordersData = ordersResult.success ? ordersResult.data : { total: 0, items: [] };

    const totalRevenue = (ordersData.items || []).reduce((sum: number, order: any) => 
      sum + Number(order.totalAmount || order.total || 0), 0);

    const metrics = {
      totalProducts: 0, // Can be added when needed
      totalStock: 0,
      totalOrders: ordersData.total || ordersData.items?.length || 0,
      totalRevenue,
      totalCustomers: 0,
      totalSuppliers: 0,
    };

    const formatted = formatAnalyticsOverview({ metrics });
    return { success: true, data: metrics, formatted };
  } catch (error) {
    console.error("Analytics overview error:", error);
    return {
      success: false,
      error: "Failed to retrieve analytics data",
    };
  }
}

/**
 * Handle revenue queries
 */
export async function handleRevenueQuery(
  companyId: string
): Promise<QueryResult> {
  try {
    // Call server action directly instead of API endpoint
    const { getOrders } = await import("@/lib/actions/orders");
    
    const result = await getOrders({ limit: 100 });
    
    if (!result.success || !result.data) {
      return {
        success: true,
        data: [],
        formatted: "💰 **Revenue Analytics**\n\nNo order data available yet. Start creating orders to track revenue!",
      };
    }

    const data = result.data;
    
    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "💰 **Revenue Analytics**\n\nNo order data available yet. Start creating orders to track revenue!",
      };
    }

    const formatted = formatRevenueData(data);
    return { success: true, data, formatted };
  } catch (error) {
    console.error("Revenue query error:", error);
    return {
      success: false,
      error: "Failed to retrieve revenue data",
    };
  }
}

/**
 * Handle customer metrics queries
 */
export async function handleCustomerMetrics(
  companyId: string
): Promise<QueryResult> {
  try {
    const queryParams = new URLSearchParams({
      limit: "50",
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/customers?${queryParams.toString()}`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: true,
        formatted: "👥 **Customer Metrics**\n\nCustomer data is not available yet. This feature is coming soon!",
      };
    }

    const data = await response.json();
    const formatted = formatCustomerMetrics(data);
    return { success: true, data, formatted };
  } catch (error) {
    console.error("Customer metrics error:", error);
    return {
      success: true,
      formatted: "👥 **Customer Metrics**\n\nCustomer data is not available yet.",
    };
  }
}

/**
 * Handle product metrics queries
 */
export async function handleProductMetrics(
  companyId: string
): Promise<QueryResult> {
  try {
    const queryParams = new URLSearchParams({
      limit: "100",
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/inventory/products?${queryParams.toString()}`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Product metrics API error:", errorText);
      return {
        success: false,
        error: `Failed to fetch products: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return {
        success: true,
        data: { total: 0, items: [] },
        formatted: "🛍️ **Product Metrics**\n\nNo products found. Start adding products to see metrics!",
      };
    }

    const formatted = formatProductMetrics(data);
    return { success: true, data, formatted };
  } catch (error) {
    console.error("Product metrics error:", error);
    return {
      success: false,
      error: "Failed to retrieve product data",
    };
  }
}

/**
 * Route query based on intent
 */
export async function handleLiveDataQuery(
  intent: IntentType,
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  switch (intent) {
    case "inventory.lookup":
      return handleInventoryLookup(parameters, companyId);
    
    case "inventory.lowstock":
      return handleLowStockQuery(companyId);
    
    case "orders.status":
      return handleOrderStatus(parameters, companyId);
    
    case "orders.recent":
      return handleRecentOrders(companyId);
    
    case "audits.recent":
      return handleRecentAudits(companyId);
    
    case "audits.status":
      return handleAuditStatus(parameters, companyId);
    
    case "analytics.overview":
      return handleAnalyticsOverview(companyId);
    
    case "analytics.revenue":
      return handleRevenueQuery(companyId);
    
    case "analytics.customers":
      return handleCustomerMetrics(companyId);
    
    case "analytics.products":
      return handleProductMetrics(companyId);
    
    case "shipments.today":
    case "shipments.pending":
      // TODO: Implement shipment queries when API is available
      return {
        success: true,
        formatted: "Shipment tracking is coming soon. Please check the purchase orders page for delivery status.",
      };
    
    case "suppliers.list":
      // TODO: Implement supplier queries when API is available
      return {
        success: true,
        formatted: "Supplier information is available on the suppliers page. Navigate to Inventory > Suppliers.",
      };
    
    default:
      return {
        success: false,
        error: `Unsupported live data intent: ${intent}`,
      };
  }
}

// Formatting helpers

function formatAnalyticsOverview(data: any): string {
  const metrics = data.metrics || data;
  return `📊 **Business Overview**\n\n` +
    `🛍️ Products: ${metrics.totalProducts || 0}\n` +
    `📦 Total Stock: ${metrics.totalStock || 0} units\n` +
    `📋 Orders: ${metrics.totalOrders || 0}\n` +
    `💰 Revenue: $${Number(metrics.totalRevenue || 0).toLocaleString()}\n` +
    `👥 Customers: ${metrics.totalCustomers || 0}\n` +
    `🏭 Suppliers: ${metrics.totalSuppliers || 0}`;
}

function formatRevenueData(data: any): string {
  const items = data.items || data.orders || [];
  const totalRevenue = items.reduce((sum: number, order: any) => sum + Number(order.totalAmount || order.total || 0), 0);
  const orderCount = items.length;
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  
  return `💰 **Revenue Analytics**\n\n` +
    `Total Revenue: $${totalRevenue.toLocaleString()}\n` +
    `Total Orders: ${orderCount}\n` +
    `Average Order Value: $${avgOrderValue.toFixed(2)}\n\n` +
    `Recent orders are driving your revenue. View detailed reports in the analytics section.`;
}

function formatCustomerMetrics(data: any): string {
  const items = data.items || data.customers || [];
  const totalCustomers = data.total || items.length;
  
  return `👥 **Customer Metrics**\n\n` +
    `Total Customers: ${totalCustomers}\n` +
    `Active Customers: ${items.filter((c: any) => c.status === 'active').length}\n\n` +
    (items.length > 0 ? `Recent customers:\n` + items.slice(0, 5).map((c: any) => 
      `• ${c.name || 'Unknown'} - ${c.email || 'No email'}`
    ).join('\n') : 'No customer data available.');
}

function formatProductMetrics(data: any): string {
  const items = data.items || data.products || [];
  const totalProducts = data.total || items.length;
  const totalStock = items.reduce((sum: number, p: any) => sum + Number(p.totalQuantity || p.quantity || 0), 0);
  const avgPrice = items.length > 0 ? items.reduce((sum: number, p: any) => sum + Number(p.sellingPrice || p.price || 0), 0) / items.length : 0;
  
  return `🛍️ **Product Metrics**\n\n` +
    `Total Products: ${totalProducts}\n` +
    `Total Stock: ${totalStock} units\n` +
    `Average Price: $${avgPrice.toFixed(2)}\n\n` +
    `Top categories: ${[...new Set(items.map((p: any) => p.categoryName).filter(Boolean))].slice(0, 3).join(', ') || 'None'}`;
}

function formatInventoryResults(items: any[]): string {
  if (items.length === 0) return "No products found.";
  
  const formatted = items.slice(0, 10).map((item) => {
    const stock = item.totalQuantity || item.quantity || 0;
    const price = item.sellingPrice || item.price || 0;
    return `• ${item.name} (SKU: ${item.sku})\n  Stock: ${stock} units | Price: $${Number(price).toFixed(2)}`;
  }).join("\n\n");

  const more = items.length > 10 ? `\n\n...and ${items.length - 10} more products.` : "";
  return formatted + more;
}

function formatLowStockResults(items: any[]): string {
  if (items.length === 0) return "No low stock items.";
  
  const formatted = items.slice(0, 15).map((item) => {
    const stock = item.totalQuantity || item.quantity || 0;
    const reorderPoint = item.reorderPoint || item.minStockLevel || 0;
    return `⚠️ ${item.name} (SKU: ${item.sku})\n  Current: ${stock} units | Reorder at: ${reorderPoint} units`;
  }).join("\n\n");

  const more = items.length > 15 ? `\n\n...and ${items.length - 15} more low stock items.` : "";
  return `${items.length} items need attention:\n\n${formatted}${more}`;
}

function formatOrderResults(items: any[]): string {
  if (items.length === 0) return "No orders found.";
  
  const formatted = items.slice(0, 5).map((item) => {
    const total = item.totalAmount || item.total || 0;
    const status = item.status || "Unknown";
    const orderNum = item.orderNumber || item.id;
    return `Order ${orderNum}\n  Status: ${status} | Total: $${Number(total).toFixed(2)}\n  Date: ${new Date(item.createdAt).toLocaleDateString()}`;
  }).join("\n\n");

  return formatted;
}

function formatRecentOrdersResults(items: any[]): string {
  if (items.length === 0) return "No recent orders.";
  
  const formatted = items.slice(0, 10).map((item) => {
    const total = item.totalAmount || item.total || 0;
    const status = item.status || "Unknown";
    const orderNum = item.orderNumber || item.id;
    return `• Order ${orderNum} - ${status} - $${Number(total).toFixed(2)} (${new Date(item.createdAt).toLocaleDateString()})`;
  }).join("\n");

  const more = items.length > 10 ? `\n\n...and ${items.length - 10} more orders.` : "";
  return `Found ${items.length} recent orders:\n\n${formatted}${more}`;
}
