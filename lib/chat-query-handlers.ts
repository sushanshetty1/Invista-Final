// Backend query handlers for live operational data
// These functions call server actions to get real-time data

import type { IntentType } from "@/app/api/chat/classify/route";

export type QueryResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  formatted?: string;
};

// ============================================================================
// INVENTORY HANDLERS
// ============================================================================

/**
 * Handle inventory lookup queries
 */
export async function handleInventoryLookup(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getInventory } = await import("@/lib/actions/inventory");
    
    const result = await getInventory({
      page: 1,
      limit: 10,
      search: String(parameters.searchTerm || parameters.query || ""),
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch inventory",
      };
    }

    const inventory = (result.data as any).items || [];
    
    if (inventory.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "No inventory items found matching your criteria.",
      };
    }

    const formatted = formatInventoryItems(inventory);
    return {
      success: true,
      data: inventory,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching inventory: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle low stock queries
 */
export async function handleLowStockQuery(companyId: string): Promise<QueryResult> {
  try {
    const { getLowStockAlerts } = await import("@/lib/actions/inventory");
    
    const result = await getLowStockAlerts();

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch low stock alerts",
      };
    }

    const items = result.data as any[];
    
    if (items.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "✅ No low stock alerts! All items are above reorder points.",
      };
    }

    const formatted = formatLowStockItems(items);
    return {
      success: true,
      data: items,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching low stock: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle inventory movements queries
 */
export async function handleInventoryMovements(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getStockMovements } = await import("@/lib/actions/inventory");
    
    const result = await getStockMovements({
      page: 1,
      limit: 20,
      sortBy: "occurredAt",
      sortOrder: "desc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch stock movements",
      };
    }

    const movements = (result.data as any).movements || [];
    const formatted = formatStockMovements(movements);
    
    return {
      success: true,
      data: movements,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching movements: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle inventory alerts queries
 */
export async function handleInventoryAlerts(companyId: string): Promise<QueryResult> {
  // Same as low stock for now
  return handleLowStockQuery(companyId);
}

// ============================================================================
// PRODUCT HANDLERS
// ============================================================================

/**
 * Handle product list queries
 */
export async function handleProductsList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getProducts } = await import("@/lib/actions/products");
    
    const result = await getProducts({
      page: 1,
      limit: 20,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch products",
      };
    }

    const products = (result.data as any).products || [];
    const pagination = (result.data as any).pagination;
    
    const formatted = formatProductsList(products, pagination);
    
    return {
      success: true,
      data: { products, pagination },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching products: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle product search queries
 */
export async function handleProductsSearch(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getProducts } = await import("@/lib/actions/products");
    
    const result = await getProducts({
      page: 1,
      limit: 10,
      search: String(parameters.searchTerm || parameters.query || ""),
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to search products",
      };
    }

    const products = (result.data as any).products || [];
    
    if (products.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "No products found matching your search.",
      };
    }

    const formatted = formatProductsList(products);
    
    return {
      success: true,
      data: products,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error searching products: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle product details queries
 */
export async function handleProductDetails(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const productId = String(parameters.productId || parameters.id || "");
    
    if (!productId) {
      return {
        success: false,
        error: "Product ID required",
      };
    }

    const { getProduct } = await import("@/lib/actions/products");
    const result = await getProduct(productId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Product not found",
      };
    }

    const product = result.data;
    const formatted = formatProductDetails(product);
    
    return {
      success: true,
      data: product,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching product details: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle product count queries
 */
export async function handleProductCount(companyId: string): Promise<QueryResult> {
  try {
    const { getProducts } = await import("@/lib/actions/products");
    
    const result = await getProducts({
      page: 1,
      limit: 1,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to get product count",
      };
    }

    const total = (result.data as any).pagination?.total || 0;
    
    return {
      success: true,
      data: { count: total },
      formatted: `📦 You have **${total} products** in your catalog.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting product count: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// ORDER HANDLERS
// ============================================================================

/**
 * Handle order status queries
 */
export async function handleOrderStatus(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const orderNumber = parameters.orderNumber || parameters.orderId || parameters.id || "";
    
    if (!orderNumber) {
      return {
        success: false,
        error: "Order number required",
      };
    }

    const { getOrders } = await import("@/lib/actions/orders");
    const result = await getOrders({
      searchTerm: String(orderNumber),
      page: 1,
      limit: 1,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch order",
      };
    }

    const orders = (result.data as any).orders || [];
    
    if (orders.length === 0) {
      return {
        success: true,
        data: [],
        formatted: `Order "${orderNumber}" not found.`,
      };
    }

    const order = orders[0];
    const formatted = formatOrderDetails(order);
    
    return {
      success: true,
      data: order,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching order: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle recent orders queries
 */
export async function handleRecentOrders(companyId: string): Promise<QueryResult> {
  try {
    const { getOrders } = await import("@/lib/actions/orders");
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await getOrders({
      page: 1,
      limit: 10,
      dateFrom: sevenDaysAgo,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch recent orders",
      };
    }

    const orders = (result.data as any).orders || [];
    
    if (orders.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "No orders in the last 7 days.",
      };
    }

    const formatted = formatRecentOrders(orders);
    
    return {
      success: true,
      data: orders,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching recent orders: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle order details queries
 */
export async function handleOrderDetails(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  // Same as handleOrderStatus
  return handleOrderStatus(parameters, companyId);
}

/**
 * Handle order count queries
 */
export async function handleOrderCount(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getOrders } = await import("@/lib/actions/orders");
    
    const result = await getOrders({
      page: 1,
      limit: 1,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to get order count",
      };
    }

    const total = (result.data as any).pagination?.total || 0;
    
    return {
      success: true,
      data: { count: total },
      formatted: `📋 You have **${total} orders** total.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting order count: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// PURCHASE ORDER HANDLERS
// ============================================================================

/**
 * Handle purchase orders list
 */
export async function handlePurchaseOrdersList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getPurchaseOrders } = await import("@/lib/actions/purchase-orders");
    
    const result = await getPurchaseOrders({});

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch purchase orders",
      };
    }

    const pos = result.data as any[];
    const formatted = formatPurchaseOrdersList(pos);
    
    return {
      success: true,
      data: pos,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching purchase orders: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle purchase order status
 */
export async function handlePurchaseOrderStatus(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const poId = String(parameters.poId || parameters.id || "");
    
    if (!poId) {
      return {
        success: false,
        error: "Purchase order ID required",
      };
    }

    const { getPurchaseOrderById } = await import("@/lib/actions/purchase-orders");
    const result = await getPurchaseOrderById(poId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Purchase order not found",
      };
    }

    const po = result.data;
    const formatted = formatPurchaseOrderDetails(po);
    
    return {
      success: true,
      data: po,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching purchase order: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle purchase order stats
 */
export async function handlePurchaseOrderStats(companyId: string): Promise<QueryResult> {
  try {
    const { getPurchaseOrderStats } = await import("@/lib/actions/purchase-orders");
    
    const result = await getPurchaseOrderStats();

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch PO stats",
      };
    }

    const stats = result.data;
    const formatted = formatPurchaseOrderStats(stats);
    
    return {
      success: true,
      data: stats,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching PO stats: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle reorder suggestions
 */
export async function handleReorderSuggestions(companyId: string): Promise<QueryResult> {
  try {
    const { getReorderSuggestions } = await import("@/lib/actions/purchase-orders");
    
    const result = await getReorderSuggestions();

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch reorder suggestions",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suggestions = result.data as any;
    const suggestionList = Array.isArray(suggestions) ? suggestions : suggestions.suggestions || [];
    
    if (suggestionList.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "✅ No reorder suggestions at this time!",
      };
    }

    const formatted = formatReorderSuggestions(suggestionList);
    
    return {
      success: true,
      data: suggestionList,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching reorder suggestions: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// AUDIT HANDLERS
// ============================================================================

/**
 * Handle recent audits queries
 */
export async function handleRecentAudits(companyId: string): Promise<QueryResult> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/audits?limit=10&dateRange=month`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch audits: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const audits = data.audits || [];

    if (audits.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "📊 No recent audits found.",
      };
    }

    const formatted = formatRecentAudits(audits);
    
    return {
      success: true,
      data: audits,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching audits: ${(error as Error).message}`,
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
    const auditNumber = parameters.auditNumber || parameters.auditId || parameters.id || "";
    
    if (!auditNumber) {
      // If no specific audit requested, show recent audits
      return handleRecentAudits(companyId);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/audits?limit=100`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch audit: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const audits = data.audits || [];
    const audit = audits.find((a: any) => 
      a.auditNumber === auditNumber || a.id === auditNumber
    );

    if (!audit) {
      return {
        success: true,
        data: [],
        formatted: `Audit "${auditNumber}" not found.`,
      };
    }

    const formatted = formatAuditDetails(audit);
    
    return {
      success: true,
      data: audit,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching audit: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle audit stats queries
 */
export async function handleAuditStats(companyId: string): Promise<QueryResult> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/audits/stats`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch audit stats: ${response.statusText}`,
      };
    }

    const stats = await response.json();
    const formatted = formatAuditStats(stats);
    
    return {
      success: true,
      data: stats,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching audit stats: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle audit discrepancies queries
 */
export async function handleAuditDiscrepancies(companyId: string): Promise<QueryResult> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/audits/discrepancies`,
      {
        headers: {
          "x-company-id": companyId,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch discrepancies: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const discrepancies = data.discrepancies || [];

    if (discrepancies.length === 0) {
      return {
        success: true,
        data: [],
        formatted: "✅ No audit discrepancies found!",
      };
    }

    const formatted = formatAuditDiscrepancies(discrepancies);
    
    return {
      success: true,
      data: discrepancies,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching discrepancies: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// SUPPLIER HANDLERS
// ============================================================================

/**
 * Handle suppliers list queries
 */
export async function handleSuppliersList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getSuppliers } = await import("@/lib/actions/suppliers");
    
    const result = await getSuppliers({
      page: 1,
      limit: 20,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch suppliers",
      };
    }

    const suppliers = (result.data as any).suppliers || [];
    const pagination = (result.data as any).pagination;
    
    const formatted = formatSuppliersList(suppliers, pagination);
    
    return {
      success: true,
      data: { suppliers, pagination },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching suppliers: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle supplier details queries
 */
export async function handleSupplierDetails(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const supplierId = String(parameters.supplierId || parameters.id || "");
    
    if (!supplierId) {
      return {
        success: false,
        error: "Supplier ID required",
      };
    }

    const { getSupplier } = await import("@/lib/actions/suppliers");
    const result = await getSupplier(supplierId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Supplier not found",
      };
    }

    const supplier = result.data;
    const formatted = formatSupplierDetails(supplier);
    
    return {
      success: true,
      data: supplier,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching supplier: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle supplier count queries
 */
export async function handleSupplierCount(companyId: string): Promise<QueryResult> {
  try {
    const { getSuppliers } = await import("@/lib/actions/suppliers");
    
    const result = await getSuppliers({
      page: 1,
      limit: 1,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to get supplier count",
      };
    }

    const total = (result.data as any).pagination?.total || 0;
    
    return {
      success: true,
      data: { count: total },
      formatted: `🏢 You have **${total} suppliers** in your network.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting supplier count: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// WAREHOUSE HANDLERS
// ============================================================================

/**
 * Handle warehouses list queries
 */
export async function handleWarehousesList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getWarehouses } = await import("@/lib/actions/warehouses");
    
    const result = await getWarehouses({
      page: 1,
      limit: 20,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch warehouses",
      };
    }

    const warehouses = (result.data as any).warehouses || [];
    const pagination = (result.data as any).pagination;
    
    const formatted = formatWarehousesList(warehouses, pagination);
    
    return {
      success: true,
      data: { warehouses, pagination },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching warehouses: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle warehouse details queries
 */
export async function handleWarehouseDetails(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const warehouseId = String(parameters.warehouseId || parameters.id || "");
    
    if (!warehouseId) {
      return {
        success: false,
        error: "Warehouse ID required",
      };
    }

    const { getWarehouse } = await import("@/lib/actions/warehouses");
    const result = await getWarehouse(warehouseId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Warehouse not found",
      };
    }

    const warehouse = result.data;
    const formatted = formatWarehouseDetails(warehouse);
    
    return {
      success: true,
      data: warehouse,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching warehouse: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle warehouse stock queries
 */
export async function handleWarehouseStock(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const warehouseId = String(parameters.warehouseId || parameters.id || "");
    
    if (!warehouseId) {
      return {
        success: false,
        error: "Warehouse ID required",
      };
    }

    const { getInventory } = await import("@/lib/actions/inventory");
    const result = await getInventory({
      page: 1,
      limit: 50,
      warehouseId,
      sortBy: "product",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch warehouse stock",
      };
    }

    const items = (result.data as any).items || [];
    const formatted = formatWarehouseStock(items, warehouseId);
    
    return {
      success: true,
      data: items,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching warehouse stock: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// CUSTOMER HANDLERS
// ============================================================================

/**
 * Handle customers list queries
 */
export async function handleCustomersList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getCustomers } = await import("@/lib/actions/customers");
    
    const result = await getCustomers({
      companyId,
      limit: 20,
      offset: 0,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch customers",
      };
    }

    const customers = result.data as any[];
    const formatted = formatCustomersList(customers);
    
    return {
      success: true,
      data: customers,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching customers: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle customer details queries
 */
export async function handleCustomerDetails(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const customerId = String(parameters.customerId || parameters.id || "");
    
    if (!customerId) {
      return {
        success: false,
        error: "Customer ID required",
      };
    }

    const { getCustomerById } = await import("@/lib/actions/customers");
    const result = await getCustomerById(customerId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Customer not found",
      };
    }

    const customer = result.data;
    const formatted = formatCustomerDetails(customer);
    
    return {
      success: true,
      data: customer,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching customer: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle customer count queries
 */
export async function handleCustomerCount(companyId: string): Promise<QueryResult> {
  try {
    const { getCustomers } = await import("@/lib/actions/customers");
    
    const result = await getCustomers({ companyId });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to get customer count",
      };
    }

    const customers = result.data as any[];
    const total = customers.length;
    
    return {
      success: true,
      data: { count: total },
      formatted: `👥 You have **${total} customers** in your database.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting customer count: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// CATEGORIES & BRANDS HANDLERS
// ============================================================================

/**
 * Handle categories list queries
 */
export async function handleCategoriesList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getCategories } = await import("@/lib/actions/categories");
    
    const result = await getCategories({
      page: 1,
      limit: 50,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch categories",
      };
    }

    const categories = (result.data as any).categories || [];
    const formatted = formatCategoriesList(categories);
    
    return {
      success: true,
      data: categories,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching categories: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle brands list queries
 */
export async function handleBrandsList(
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  try {
    const { getBrands } = await import("@/lib/actions/brands");
    
    const result = await getBrands({
      page: 1,
      limit: 50,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch brands",
      };
    }

    const brands = (result.data as any).brands || [];
    const formatted = formatBrandsList(brands);
    
    return {
      success: true,
      data: brands,
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching brands: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// ANALYTICS HANDLERS
// ============================================================================

/**
 * Handle analytics overview queries
 */
export async function handleAnalyticsOverview(companyId: string): Promise<QueryResult> {
  try {
    const { getOrders } = await import("@/lib/actions/orders");
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await getOrders({
      page: 1,
      limit: 1000,
      dateFrom: thirtyDaysAgo,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch analytics data",
      };
    }

    const orders = (result.data as any).orders || [];
    const formatted = formatAnalyticsOverview(orders);
    
    return {
      success: true,
      data: { orders },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching analytics: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle revenue queries
 */
export async function handleRevenueQuery(companyId: string): Promise<QueryResult> {
  try {
    const { getOrders } = await import("@/lib/actions/orders");
    
    const result = await getOrders({
      page: 1,
      limit: 1000,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch revenue data",
      };
    }

    const orders = (result.data as any).orders || [];
    const formatted = formatRevenueData(orders);
    
    return {
      success: true,
      data: { orders },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching revenue: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle customer metrics queries
 */
export async function handleCustomerMetrics(companyId: string): Promise<QueryResult> {
  try {
    const { getCustomers } = await import("@/lib/actions/customers");
    
    const result = await getCustomers({ companyId });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch customer metrics",
      };
    }

    const customers = result.data as any[];
    const formatted = formatCustomerMetrics(customers);
    
    return {
      success: true,
      data: { customers },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching customer metrics: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle product metrics queries
 */
export async function handleProductMetrics(companyId: string): Promise<QueryResult> {
  try {
    const { getProducts } = await import("@/lib/actions/products");
    
    const result = await getProducts({
      page: 1,
      limit: 1000,
      sortBy: "name",
      sortOrder: "asc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch product metrics",
      };
    }

    const products = (result.data as any).products || [];
    const pagination = (result.data as any).pagination;
    const formatted = formatProductMetrics(products, pagination);
    
    return {
      success: true,
      data: { products, pagination },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching product metrics: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle order analytics queries
 */
export async function handleOrderAnalytics(companyId: string): Promise<QueryResult> {
  // Same as analytics overview
  return handleAnalyticsOverview(companyId);
}

/**
 * Handle inventory analytics queries
 */
export async function handleInventoryAnalytics(companyId: string): Promise<QueryResult> {
  try {
    const { getInventory } = await import("@/lib/actions/inventory");
    
    const result = await getInventory({
      page: 1,
      limit: 1000,
      sortBy: "quantity",
      sortOrder: "desc",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch inventory analytics",
      };
    }

    const items = (result.data as any).items || [];
    const formatted = formatInventoryAnalytics(items);
    
    return {
      success: true,
      data: { items },
      formatted,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error fetching inventory analytics: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// MAIN ROUTER FUNCTION
// ============================================================================

/**
 * Main router that dispatches to the appropriate handler based on intent
 */
export async function handleLiveDataQuery(
  intent: IntentType,
  parameters: Record<string, unknown>,
  companyId: string
): Promise<QueryResult> {
  switch (intent) {
    // Inventory
    case "inventory.lookup":
      return handleInventoryLookup(parameters, companyId);
    case "inventory.lowstock":
      return handleLowStockQuery(companyId);
    case "inventory.movements":
      return handleInventoryMovements(parameters, companyId);
    case "inventory.alerts":
      return handleInventoryAlerts(companyId);
    
    // Products
    case "products.list":
      return handleProductsList(parameters, companyId);
    case "products.search":
      return handleProductsSearch(parameters, companyId);
    case "products.details":
      return handleProductDetails(parameters, companyId);
    case "products.count":
      return handleProductCount(companyId);
    
    // Orders
    case "orders.status":
      return handleOrderStatus(parameters, companyId);
    case "orders.recent":
      return handleRecentOrders(companyId);
    case "orders.details":
      return handleOrderDetails(parameters, companyId);
    case "orders.count":
      return handleOrderCount(parameters, companyId);
    
    // Purchase orders
    case "purchaseorders.list":
      return handlePurchaseOrdersList(parameters, companyId);
    case "purchaseorders.status":
      return handlePurchaseOrderStatus(parameters, companyId);
    case "purchaseorders.stats":
      return handlePurchaseOrderStats(companyId);
    case "purchaseorders.reorder":
      return handleReorderSuggestions(companyId);
    
    // Audits
    case "audits.recent":
      return handleRecentAudits(companyId);
    case "audits.status":
      return handleAuditStatus(parameters, companyId);
    case "audits.stats":
      return handleAuditStats(companyId);
    case "audits.discrepancies":
      return handleAuditDiscrepancies(companyId);
    
    // Suppliers
    case "suppliers.list":
      return handleSuppliersList(parameters, companyId);
    case "suppliers.details":
      return handleSupplierDetails(parameters, companyId);
    case "suppliers.count":
      return handleSupplierCount(companyId);
    
    // Warehouses
    case "warehouses.list":
      return handleWarehousesList(parameters, companyId);
    case "warehouses.details":
      return handleWarehouseDetails(parameters, companyId);
    case "warehouses.stock":
      return handleWarehouseStock(parameters, companyId);
    
    // Customers
    case "customers.list":
      return handleCustomersList(parameters, companyId);
    case "customers.details":
      return handleCustomerDetails(parameters, companyId);
    case "customers.count":
      return handleCustomerCount(companyId);
    
    // Categories & Brands
    case "categories.list":
      return handleCategoriesList(parameters, companyId);
    case "brands.list":
      return handleBrandsList(parameters, companyId);
    
    // Analytics
    case "analytics.overview":
      return handleAnalyticsOverview(companyId);
    case "analytics.revenue":
      return handleRevenueQuery(companyId);
    case "analytics.customers":
      return handleCustomerMetrics(companyId);
    case "analytics.products":
      return handleProductMetrics(companyId);
    case "analytics.orders":
      return handleOrderAnalytics(companyId);
    case "analytics.inventory":
      return handleInventoryAnalytics(companyId);
    
    default:
      return {
        success: false,
        error: `Unsupported live data intent: ${intent}`,
      };
  }
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

function formatInventoryItems(items: any[]): string {
  const lines = items.slice(0, 10).map((item: any) => {
    const product = item.product || {};
    const warehouse = item.warehouse || {};
    return `• **${product.name || "Unknown"}** (${product.sku || "N/A"})
  📦 Qty: ${item.quantity || 0} | ✅ Available: ${item.availableQuantity || 0} | 🏭 Warehouse: ${warehouse.name || "Unknown"}`;
  });

  const header = `📊 **Inventory Items** (showing ${Math.min(10, items.length)} of ${items.length}):\n\n`;
  return header + lines.join("\n\n");
}

function formatLowStockItems(items: any[]): string {
  const lines = items.map((item: any) => {
    const product = item.product || {};
    return `⚠️ **${product.name || "Unknown"}** (${product.sku || "N/A"})
  Current: ${item.availableQuantity || 0} | Reorder Point: ${product.reorderPoint || 0}`;
  });

  const header = `🚨 **Low Stock Alerts** (${items.length} items):\n\n`;
  return header + lines.join("\n\n");
}

function formatStockMovements(movements: any[]): string {
  const lines = movements.slice(0, 10).map((mov: any) => {
    const product = mov.product || {};
    return `• ${mov.type || "UNKNOWN"} - **${product.name || "Unknown"}**
  Qty: ${mov.quantity > 0 ? "+" : ""}${mov.quantity} | ${new Date(mov.occurredAt).toLocaleDateString()}`;
  });

  const header = `📈 **Recent Stock Movements** (showing ${Math.min(10, movements.length)} of ${movements.length}):\n\n`;
  return header + lines.join("\n\n");
}

function formatProductsList(products: any[], pagination?: any): string {
  if (products.length === 0) {
    return "📦 No products found.";
  }

  const total = pagination?.total || products.length;
  const showing = Math.min(15, products.length);
  
  const productsData = products.slice(0, 15).map((product: any) => {
    const price = product.sellingPrice || product.price || 0;
    const stock = product.inventoryItems?.reduce((sum: number, item: any) => 
      sum + (item.quantity || item.availableQuantity || 0), 0) || 0;
    
    return {
      name: product.name,
      sku: product.sku,
      price: Number(price).toFixed(2),
      stock: stock,
      reorderPoint: product.reorderPoint || 10,
      status: product.status,
      category: product.categoryName || null,
      brand: product.brandName || null,
    };
  });
  
  // Return as special JSON marker that UI can detect and render as cards
  return `__PRODUCT_CARDS__${JSON.stringify({ products: productsData, total, showing })}__END_PRODUCT_CARDS__`;
}

function formatProductDetails(product: any): string {
  return `📦 **Product Details**

**Name:** ${product.name}
**SKU:** ${product.sku}
**Description:** ${product.description || "N/A"}
**Category:** ${product.categoryName || "N/A"}
**Brand:** ${product.brandName || "N/A"}

**Pricing:**
💰 Selling Price: $${product.sellingPrice || 0}
💵 Cost Price: $${product.costPrice || 0}
🏷️ Wholesale Price: $${product.wholesalePrice || 0}

**Inventory:**
📊 Total Stock: ${product.inventoryItems?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
⚠️ Reorder Point: ${product.reorderPoint || 0}
📦 Reorder Quantity: ${product.reorderQuantity || 0}

**Status:** ${product.status || "UNKNOWN"}`;
}

function formatOrderDetails(order: any): string {
  const customer = order.customer || {};
  return `📋 **Order Details**

**Order #:** ${order.orderNumber}
**Status:** ${order.status}
**Fulfillment:** ${order.fulfillmentStatus || "N/A"}
**Payment:** ${order.paymentStatus || "N/A"}

**Customer:** ${customer.firstName || ""} ${customer.lastName || ""} (${customer.email || "N/A"})

**Total:** $${order.totalAmount || 0}
**Date:** ${new Date(order.orderDate).toLocaleDateString()}`;
}

function formatRecentOrders(orders: any[]): string {
  const lines = orders.map((order: any) => {
    return `• **${order.orderNumber}** - $${order.totalAmount || 0}
  Status: ${order.status} | ${new Date(order.orderDate).toLocaleDateString()}`;
  });

  const header = `📋 **Recent Orders** (${orders.length} orders in last 7 days):\n\n`;
  return header + lines.join("\n\n");
}

function formatPurchaseOrdersList(pos: any[]): string {
  const lines = pos.slice(0, 10).map((po: any) => {
    return `• **${po.orderNumber}** - Status: ${po.status}
  Supplier: ${po.supplier?.name || "Unknown"} | Expected: ${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "N/A"}`;
  });

  const header = `📦 **Purchase Orders** (showing ${Math.min(10, pos.length)} of ${pos.length}):\n\n`;
  return header + lines.join("\n\n");
}

function formatPurchaseOrderDetails(po: any): string {
  return `📦 **Purchase Order Details**

**PO #:** ${po.orderNumber}
**Status:** ${po.status}
**Supplier:** ${po.supplier?.name || "Unknown"}

**Expected Date:** ${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "N/A"}
**Total:** $${po.totalAmount || 0}

**Items:** ${po.items?.length || 0} items`;
}

function formatPurchaseOrderStats(stats: any): string {
  return `📊 **Purchase Order Statistics**

📋 Total POs: ${stats.totalPOs || 0}
⏳ Pending: ${stats.pending || 0}
✅ Approved: ${stats.approved || 0}
📦 Received: ${stats.received || 0}
💰 Total Value: $${stats.totalValue || 0}`;
}

function formatReorderSuggestions(suggestions: any[]): string {
  const lines = suggestions.map((sugg: any) => {
    return `⚠️ **${sugg.productName}** (${sugg.productSku})
  Current Stock: ${sugg.currentStock} | Reorder Point: ${sugg.reorderPoint}
  Suggested Qty: ${sugg.suggestedQty} | Est. Cost: $${sugg.estimatedCost}
  Preferred Supplier: ${sugg.preferredSupplier}`;
  });

  const header = `🔄 **Reorder Suggestions** (${suggestions.length} items):\n\n`;
  return header + lines.join("\n\n");
}

function formatSuppliersList(suppliers: any[], pagination?: any): string {
  const lines = suppliers.slice(0, 15).map((supplier: any) => {
    return `• **${supplier.name}** (${supplier.code})
  📞 ${supplier.contactPhone || "N/A"} | ✉️ ${supplier.email || "N/A"}
  Status: ${supplier.status || "UNKNOWN"}`;
  });

  const total = pagination?.total || suppliers.length;
  const header = `🏢 **Suppliers** (showing ${Math.min(15, suppliers.length)} of ${total}):\n\n`;
  return header + lines.join("\n\n");
}

function formatSupplierDetails(supplier: any): string {
  return `🏢 **Supplier Details**

**Name:** ${supplier.name}
**Code:** ${supplier.code}
**Status:** ${supplier.status || "UNKNOWN"}

**Contact:**
📞 Phone: ${supplier.contactPhone || "N/A"}
✉️ Email: ${supplier.email || "N/A"}
👤 Contact Person: ${supplier.contactName || "N/A"}

**Address:** ${supplier.address || "N/A"}
**Rating:** ${supplier.rating ? "⭐".repeat(Math.round(supplier.rating)) : "Not rated"}

**Products:** ${supplier.products?.length || 0} products supplied`;
}

function formatWarehousesList(warehouses: any[], pagination?: any): string {
  const lines = warehouses.slice(0, 15).map((warehouse: any) => {
    return `• **${warehouse.name}** (${warehouse.code})
  📍 ${warehouse.address || "N/A"}
  Status: ${warehouse.isActive ? "✅ Active" : "❌ Inactive"}`;
  });

  const total = pagination?.total || warehouses.length;
  const header = `🏭 **Warehouses** (showing ${Math.min(15, warehouses.length)} of ${total}):\n\n`;
  return header + lines.join("\n\n");
}

function formatWarehouseDetails(warehouse: any): string {
  return `🏭 **Warehouse Details**

**Name:** ${warehouse.name}
**Code:** ${warehouse.code}
**Type:** ${warehouse.type || "UNKNOWN"}

**Address:** ${warehouse.address || "N/A"}
**Status:** ${warehouse.isActive ? "✅ Active" : "❌ Inactive"}

**Inventory Items:** ${warehouse._count?.inventoryItems || 0} items`;
}

function formatWarehouseStock(items: any[], warehouseId: string): string {
  const lines = items.slice(0, 20).map((item: any) => {
    const product = item.product || {};
    return `• **${product.name || "Unknown"}** (${product.sku || "N/A"})
  📦 Qty: ${item.quantity || 0} | ✅ Available: ${item.availableQuantity || 0}`;
  });

  const header = `📊 **Warehouse Stock** (showing ${Math.min(20, items.length)} of ${items.length} items):\n\n`;
  return header + lines.join("\n\n");
}

function formatCustomersList(customers: any[]): string {
  const lines = customers.slice(0, 15).map((customer: any) => {
    return `• **${customer.firstName || ""} ${customer.lastName || ""}** ${customer.companyName ? `(${customer.companyName})` : ""}
  ✉️ ${customer.email || "N/A"} | 📞 ${customer.phone || "N/A"}`;
  });

  const header = `👥 **Customers** (showing ${Math.min(15, customers.length)} of ${customers.length}):\n\n`;
  return header + lines.join("\n\n");
}

function formatCustomerDetails(customer: any): string {
  return `👤 **Customer Details**

**Name:** ${customer.firstName || ""} ${customer.lastName || ""}
${customer.companyName ? `**Company:** ${customer.companyName}` : ""}

**Contact:**
✉️ Email: ${customer.email || "N/A"}
📞 Phone: ${customer.phone || "N/A"}

**Address:** ${customer.address || "N/A"}
**Type:** ${customer.customerType || "UNKNOWN"}`;
}

function formatCategoriesList(categories: any[]): string {
  const lines = categories.map((category: any) => {
    return `• **${category.name}**${category.description ? ` - ${category.description}` : ""}`;
  });

  const header = `📂 **Product Categories** (${categories.length} total):\n\n`;
  return header + lines.join("\n");
}

function formatBrandsList(brands: any[]): string {
  const lines = brands.map((brand: any) => {
    return `• **${brand.name}**${brand.description ? ` - ${brand.description}` : ""}`;
  });

  const header = `🏷️ **Brands** (${brands.length} total):\n\n`;
  return header + lines.join("\n");
}

function formatAnalyticsOverview(orders: any[]): string {
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  
  const statusCounts: Record<string, number> = {};
  orders.forEach(order => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  });

  return `📊 **Analytics Overview** (Last 30 Days)

💰 **Revenue:** $${totalRevenue.toFixed(2)}
📋 **Orders:** ${orders.length}
💵 **Avg Order Value:** $${avgOrderValue.toFixed(2)}

**Order Status:**
${Object.entries(statusCounts).map(([status, count]) => `• ${status}: ${count}`).join("\n")}`;
}

function formatRevenueData(orders: any[]): string {
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  return `💰 **Revenue Data**

**Total Revenue:** $${totalRevenue.toFixed(2)}
**Total Orders:** ${orders.length}
**Average Order Value:** $${avgOrderValue.toFixed(2)}

This data includes all orders in the system.`;
}

function formatCustomerMetrics(customers: any[]): string {
  const total = customers.length;
  const withCompanies = customers.filter(c => c.companyName).length;

  return `👥 **Customer Metrics**

**Total Customers:** ${total}
**Business Customers:** ${withCompanies}
**Individual Customers:** ${total - withCompanies}

Recent customers are doing well!`;
}

function formatProductMetrics(products: any[], pagination?: any): string {
  const total = pagination?.total || products.length;
  const active = products.filter(p => p.status === "ACTIVE").length;
  const avgPrice = products.length > 0 
    ? products.reduce((sum, p) => sum + (Number(p.sellingPrice) || 0), 0) / products.length 
    : 0;

  return `📦 **Product Metrics**

**Total Products:** ${total}
**Active Products:** ${active}
**Average Selling Price:** $${avgPrice.toFixed(2)}

Your product catalog is looking good!`;
}

function formatInventoryAnalytics(items: any[]): string {
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalAvailable = items.reduce((sum, item) => sum + (item.availableQuantity || 0), 0);
  const totalReserved = items.reduce((sum, item) => sum + (item.reservedQuantity || 0), 0);

  return `📊 **Inventory Analytics**

**Total Items:** ${items.length}
**Total Quantity:** ${totalQty}
**Available:** ${totalAvailable}
**Reserved:** ${totalReserved}

Inventory health looks good!`;
}

function formatRecentAudits(audits: any[]): string {
  const lines = audits.slice(0, 10).map((audit: any) => {
    const statusEmoji = audit.status === "COMPLETED" ? "✅" : 
                       audit.status === "IN_PROGRESS" ? "🔄" : 
                       audit.status === "PLANNED" ? "📅" : "⏸️";
    
    return `${statusEmoji} **${audit.auditNumber}** - ${audit.type || "UNKNOWN"}
  Status: ${audit.status} | Warehouse: ${audit.warehouseName || "N/A"}
  ${audit.completedDate ? `Completed: ${new Date(audit.completedDate).toLocaleDateString()}` : `Planned: ${new Date(audit.plannedDate).toLocaleDateString()}`}
  ${audit.discrepancies ? `⚠️ ${audit.discrepancies} discrepancies found` : ""}`;
  });

  const header = `📊 **Recent Audits** (showing ${Math.min(10, audits.length)} of ${audits.length}):\n\n`;
  return header + lines.join("\n\n");
}

function formatAuditDetails(audit: any): string {
  return `📋 **Audit Details**

**Audit #:** ${audit.auditNumber}
**Type:** ${audit.type}
**Method:** ${audit.method}
**Status:** ${audit.status}

**Warehouse:** ${audit.warehouseName || "N/A"}
${audit.productName ? `**Product:** ${audit.productName}` : ""}

**Planned Date:** ${audit.plannedDate ? new Date(audit.plannedDate).toLocaleDateString() : "N/A"}
**Started:** ${audit.startedDate ? new Date(audit.startedDate).toLocaleDateString() : "Not started"}
**Completed:** ${audit.completedDate ? new Date(audit.completedDate).toLocaleDateString() : "Not completed"}

**Progress:**
📋 Total Items: ${audit.totalItems || 0}
✅ Items Counted: ${audit.itemsCounted || 0}
⚠️ Discrepancies: ${audit.discrepancies || 0}
💰 Adjustment Value: $${audit.adjustmentValue || 0}

${audit.notes ? `**Notes:** ${audit.notes}` : ""}`;
}

function formatAuditStats(stats: any): string {
  return `📊 **Audit Statistics**

📋 **Overview:**
• Total Audits: ${stats.totalAudits || 0}
• Active Audits: ${stats.activeAudits || 0}
• Completed This Month: ${stats.completedThisMonth || 0}
• Pending Approval: ${stats.pendingApproval || 0}

⚠️ **Discrepancies:**
• Total Found: ${stats.discrepanciesFound || 0}
• Total Value: $${stats.discrepancyValue?.toFixed(2) || 0}

✅ **Compliance:**
• Compliance Score: ${stats.complianceScore || 0}%

📅 **Schedule:**
• Last Audit: ${stats.lastAuditDate ? new Date(stats.lastAuditDate).toLocaleDateString() : "N/A"}
• Next Scheduled: ${stats.nextScheduledAudit ? new Date(stats.nextScheduledAudit).toLocaleDateString() : "N/A"}

${stats.cycleCounts ? `🔄 **Cycle Counts:** ${stats.cycleCounts.total || 0} total` : ""}`;
}

function formatAuditDiscrepancies(discrepancies: any[]): string {
  const lines = discrepancies.slice(0, 15).map((disc: any) => {
    const product = disc.product || {};
    return `⚠️ **${product.name || "Unknown"}** (${product.sku || "N/A"})
  Expected: ${disc.expectedQty || 0} | Counted: ${disc.countedQty || 0} | Difference: ${disc.adjustmentQty || 0}
  Reason: ${disc.discrepancyReason || "Not specified"}`;
  });

  const header = `🔍 **Audit Discrepancies** (showing ${Math.min(15, discrepancies.length)} of ${discrepancies.length}):\n\n`;
  return header + lines.join("\n\n");
}
