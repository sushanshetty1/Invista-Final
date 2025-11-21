import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/chat-classifier";

export type IntentType =
  | "knowledge.explainer"
  // Inventory intents
  | "inventory.lookup"
  | "inventory.lowstock"
  | "inventory.movements"
  | "inventory.alerts"
  // Product intents
  | "products.list"
  | "products.search"
  | "products.details"
  | "products.count"
  // Orders intents
  | "orders.status"
  | "orders.recent"
  | "orders.details"
  | "orders.count"
  // Purchase orders intents
  | "purchaseorders.list"
  | "purchaseorders.status"
  | "purchaseorders.stats"
  | "purchaseorders.reorder"
  // Audits intents
  | "audits.recent"
  | "audits.status"
  | "audits.stats"
  | "audits.discrepancies"
  // Suppliers intents
  | "suppliers.list"
  | "suppliers.details"
  | "suppliers.count"
  // Warehouses intents
  | "warehouses.list"
  | "warehouses.details"
  | "warehouses.stock"
  // Customers intents
  | "customers.list"
  | "customers.details"
  | "customers.count"
  // Categories & Brands intents
  | "categories.list"
  | "brands.list"
  // Analytics intents
  | "analytics.overview"
  | "analytics.revenue"
  | "analytics.customers"
  | "analytics.products"
  | "analytics.orders"
  | "analytics.inventory"
  // Navigation
  | "navigation.page"
  | "fallback";

export type IntentClassification = {
  intent: IntentType;
  confidence: number;
  parameters?: Record<string, unknown>;
};

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for an inventory management system chatbot. Classify user messages into one of these intents:

**CRITICAL DISTINCTION:**
- If user asks "HOW to do X", "WHAT should I do", "HOW do I", "STEPS to" → knowledge.explainer
- If user commands "DO X", "SHOW me X", "LIST X" (without asking how) → action intent

**KNOWLEDGE & HELP**
1. knowledge.explainer - User wants to know how something works, processes, policies, SOPs, workflows, asking for instructions, OR asking about company information/identity
   Examples: "How do I create a purchase order?", "What is the reorder process?", "Explain audit workflow", "If I want to list new products what should I do?", "How do I add a supplier?", "Steps to create an order", "What's my company name?", "Tell me about my company", "Company information", "Company details", "What company am I in?", "Company profile"

**INVENTORY QUERIES**
2. inventory.lookup - User wants specific product/inventory information
   Examples: "Show me product ABC", "What's stock level for SKU-123?", "Do we have red widgets?"

3. inventory.lowstock - User wants to see low stock items or alerts
   Examples: "What items are low on stock?", "Products below reorder point", "Low stock alerts?"

4. inventory.movements - User wants to see stock movements or history
   Examples: "Show me stock movements", "Recent inventory changes", "What moved today?"

5. inventory.alerts - User wants inventory alerts (low stock, out of stock, etc.)
   Examples: "Show inventory alerts", "Any stock warnings?", "Critical stock levels"

**PRODUCT QUERIES**
6. products.list - User wants to browse or list products (direct command, not asking how)
   Examples: "Show me all products", "List products", "What products do we have?", "Product catalog"
   NOT: "How do I list products?", "What should I do to list products?" (these are knowledge.explainer)

7. products.search - User searching for specific products (direct command)
   Examples: "Search for blue widgets", "Find products in category X", "Products from brand Y"
   NOT: "How do I search for products?" (this is knowledge.explainer)

8. products.details - User wants detailed product information
   Examples: "Product details for SKU-123", "Tell me about product ABC", "Product specifications"

9. products.count - User wants product count or statistics
   Examples: "How many products?", "Total SKUs", "Product count", "Number of items"

**ORDERS QUERIES**
10. orders.status - User wants to check order status or details
    Examples: "Status of order #123?", "Is order ORD-2024-0045 shipped?", "Track order"

11. orders.recent - User wants to see recent orders
    Examples: "Show today's orders", "Recent orders", "Orders this week", "Latest orders"

12. orders.details - User wants detailed order information
    Examples: "Order details for #123", "Show me order ORD-2024-0045", "Full order info"

13. orders.count - User wants order count or statistics
    Examples: "How many orders today?", "Total orders this month", "Order count"

**PURCHASE ORDERS**
14. purchaseorders.list - User wants to see purchase orders
    Examples: "Show purchase orders", "List POs", "What POs do we have?"

15. purchaseorders.status - User wants PO status or details
    Examples: "Status of PO #123", "Is PO received?", "Track purchase order"

16. purchaseorders.stats - User wants PO statistics
    Examples: "PO stats", "Purchase order metrics", "How many pending POs?"

17. purchaseorders.reorder - User wants reorder suggestions
    Examples: "What should I reorder?", "Reorder suggestions", "Items to restock"

**AUDITS**
18. audits.recent - User wants recent audits or audit history
    Examples: "Recent audits", "Last audit", "Audit history", "Show me audits"

19. audits.status - User wants audit details or status
    Examples: "Status of audit #123", "Audit details", "Audit report"

20. audits.stats - User wants audit statistics
    Examples: "Audit stats", "How many audits?", "Audit metrics", "Audit performance"

21. audits.discrepancies - User wants discrepancy information
    Examples: "Show audit discrepancies", "What discrepancies found?", "Audit issues"

**SUPPLIERS**
22. suppliers.list - User wants to see suppliers
    Examples: "List suppliers", "Show vendors", "Who are our suppliers?"

23. suppliers.details - User wants specific supplier information
    Examples: "Supplier details for ABC Corp", "Tell me about supplier XYZ", "Supplier contact info"

24. suppliers.count - User wants supplier count
    Examples: "How many suppliers?", "Supplier count", "Number of vendors"

**WAREHOUSES**
25. warehouses.list - User wants to see warehouses
    Examples: "List warehouses", "Show locations", "What warehouses do we have?"

26. warehouses.details - User wants warehouse information
    Examples: "Warehouse details", "Tell me about warehouse A", "Location info"

27. warehouses.stock - User wants warehouse stock levels
    Examples: "Stock in warehouse A", "What's in location B?", "Warehouse inventory"

**CUSTOMERS**
28. customers.list - User wants to see customers
    Examples: "List customers", "Show clients", "Customer list"

29. customers.details - User wants customer information
    Examples: "Customer details for John", "Tell me about customer ABC", "Client info"

30. customers.count - User wants customer count
    Examples: "How many customers?", "Customer count", "Total clients"

**CATEGORIES & BRANDS**
31. categories.list - User wants product categories
    Examples: "List categories", "Show categories", "What categories do we have?"

32. brands.list - User wants product brands
    Examples: "List brands", "Show brands", "What brands do we carry?"

**ANALYTICS**
33. analytics.overview - User wants overall business metrics
    Examples: "Show analytics", "Business overview", "Dashboard stats", "KPIs"

34. analytics.revenue - User wants revenue or financial metrics
    Examples: "What's our revenue?", "Total sales", "Revenue this month", "How much did we make?"

35. analytics.customers - User wants customer analytics
    Examples: "Customer metrics", "Customer stats", "Customer analytics"

36. analytics.products - User wants product analytics
    Examples: "Product metrics", "Inventory analytics", "Product stats"

37. analytics.orders - User wants order analytics
    Examples: "Order analytics", "Order metrics", "Sales stats", "Order performance"

38. analytics.inventory - User wants inventory analytics
    Examples: "Inventory metrics", "Stock analytics", "Inventory health"

**NAVIGATION**
39. navigation.page - User wants to go to a specific page
    Examples: "Open inventory page", "Go to dashboard", "Show audits", "Take me to suppliers"

40. fallback - Cannot determine intent, greetings, or unclear requests
    Examples: "Hello", "Help", "What can you do?", unclear/ambiguous queries

Respond ONLY with valid JSON in this format:
{
  "intent": "intent.type",
  "confidence": 0.95,
  "parameters": {}
}

For navigation.page, include {"page": "page-name"} in parameters.
For lookups/searches, include relevant search terms in parameters (e.g., {"searchTerm": "...", "sku": "...", "orderNumber": "..."}).

**IMPORTANT EXAMPLES TO DISTINGUISH:**
- "How do I list products?" → knowledge.explainer (asking for instructions)
- "List products" → products.list (direct command to list)
- "If I want to see orders, what should I do?" → knowledge.explainer (asking how)
- "Show me orders" → orders.recent (direct command)
- "What's the process to add a supplier?" → knowledge.explainer (asking about process)
- "Show suppliers" → suppliers.list (direct command)

Key indicators for knowledge.explainer:
- Questions starting with "How", "What should", "If I want to", "Steps to", "Process to"
- Asking about procedures, workflows, or instructions
- Seeking guidance on using the system

Key indicators for action intents:
- Direct imperatives: "Show", "List", "Get", "Find", "Display"
- Questions starting with "What" + noun (What products, What orders)
- No "how" or "should" in the question

User message: {{MESSAGE}}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body?.message ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    // Use shared classification function
    const classification = await classifyIntent(message);
    return NextResponse.json(classification);
  } catch (error) {
    console.error("Intent classification error:", error);
    return NextResponse.json(
      { error: "Failed to classify intent" },
      { status: 500 }
    );
  }
}
