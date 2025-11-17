// Navigation map for Invista chatbot
// Maps user-friendly page names to application URLs

export type NavigationIntent = {
  page: string;
  url: string;
  description: string;
};

export const navigationMap: Record<string, NavigationIntent> = {
  // Dashboard
  dashboard: {
    page: "Dashboard",
    url: "/dashboard",
    description: "Main dashboard with overview and analytics",
  },
  home: {
    page: "Home",
    url: "/dashboard",
    description: "Main dashboard home page",
  },

  // Inventory Management
  inventory: {
    page: "Inventory",
    url: "/inventory",
    description: "Main inventory management page",
  },
  products: {
    page: "Products",
    url: "/inventory/products",
    description: "View and manage products",
  },
  stock: {
    page: "Stock",
    url: "/inventory/stock",
    description: "Stock levels and management",
  },
  categories: {
    page: "Categories",
    url: "/inventory/categories",
    description: "Product categories management",
  },
  suppliers: {
    page: "Suppliers",
    url: "/inventory/suppliers",
    description: "Supplier management",
  },
  warehouses: {
    page: "Warehouses",
    url: "/inventory/warehouses",
    description: "Warehouse management",
  },

  // Orders
  orders: {
    page: "Orders",
    url: "/orders",
    description: "View and manage orders",
  },
  "new-order": {
    page: "New Order",
    url: "/orders/new",
    description: "Create a new order",
  },

  // Purchase Orders
  "purchase-orders": {
    page: "Purchase Orders",
    url: "/purchase-orders",
    description: "Manage purchase orders",
  },
  "new-purchase-order": {
    page: "New Purchase Order",
    url: "/purchase-orders/new",
    description: "Create a new purchase order",
  },

  // Reports
  reports: {
    page: "Reports",
    url: "/reports",
    description: "View reports and analytics",
  },

  // Audits
  audits: {
    page: "Audits",
    url: "/audits",
    description: "Inventory audits and history",
  },

  // Company Profile
  "company-profile": {
    page: "Company Profile",
    url: "/company-profile",
    description: "Company settings and profile",
  },

  // User Profile
  "user-profile": {
    page: "User Profile",
    url: "/user-profile",
    description: "User account settings and profile",
  },

  // RAG Chat
  "rag-chat": {
    page: "RAG Chat",
    url: "/rag",
    description: "AI-powered chat assistant",
  },
  chat: {
    page: "Chat",
    url: "/rag",
    description: "AI-powered chat assistant",
  },
};

/**
 * Find navigation intent by user query
 * @param query User's navigation request
 * @returns NavigationIntent if found, null otherwise
 */
export function findNavigationIntent(query: string): NavigationIntent | null {
  const normalizedQuery = query.toLowerCase().trim();

  // Direct match
  if (navigationMap[normalizedQuery]) {
    return navigationMap[normalizedQuery];
  }

  // Fuzzy match - check if query contains any key
  for (const [key, intent] of Object.entries(navigationMap)) {
    if (
      normalizedQuery.includes(key) ||
      normalizedQuery.includes(intent.page.toLowerCase()) ||
      key.split("-").some((part) => normalizedQuery.includes(part))
    ) {
      return intent;
    }
  }

  return null;
}

/**
 * Get all available pages for help/listing
 */
export function getAllNavigationIntents(): NavigationIntent[] {
  return Object.values(navigationMap);
}
