# Invista Chatbot - Complete Live Data Queries Reference

This document lists **ALL available live data queries** that the Invista chatbot can handle. These queries fetch real-time operational data from your inventory management system.

## 📊 Query Categories

The chatbot supports **42+ intent types** across 12 major categories:

---

## 1. 📦 INVENTORY QUERIES

### `inventory.lookup`
**What it does:** Search for specific products or inventory items  
**Example queries:**
- "Show me product ABC"
- "What's the stock level for SKU-123?"
- "Do we have red widgets?"
- "Find product XYZ"

**Returns:** Product details, stock levels, warehouse locations

---

### `inventory.lowstock`
**What it does:** Find items below reorder point  
**Example queries:**
- "What items are low on stock?"
- "Show me products below reorder point"
- "Any low stock alerts?"
- "Items that need restocking"

**Returns:** List of low stock items with current quantity vs. reorder point

---

### `inventory.movements`
**What it does:** View stock movement history  
**Example queries:**
- "Show me stock movements"
- "Recent inventory changes"
- "What moved today?"
- "Stock transfer history"

**Returns:** List of recent stock movements (transfers, adjustments, etc.)

---

### `inventory.alerts`
**What it does:** Show inventory warnings and alerts  
**Example queries:**
- "Show inventory alerts"
- "Any stock warnings?"
- "Critical stock levels"
- "Inventory issues"

**Returns:** Active inventory alerts (low stock, out of stock, etc.)

---

## 2. 🏷️ PRODUCT QUERIES

### `products.list`
**What it does:** Browse all products in catalog  
**Example queries:**
- "Show me all products"
- "List products"
- "What products do we have?"
- "Product catalog"

**Returns:** Paginated list of products with SKU, price, status

---

### `products.search`
**What it does:** Search products by name, SKU, or category  
**Example queries:**
- "Search for blue widgets"
- "Find products in category X"
- "Products from brand Y"
- "Search SKU-123"

**Returns:** Matching products with details

---

### `products.details`
**What it does:** Get detailed information about a specific product  
**Example queries:**
- "Product details for SKU-123"
- "Tell me about product ABC"
- "Product specifications"
- "Show me product XYZ info"

**Returns:** Full product details including pricing, inventory, variants

---

### `products.count`
**What it does:** Get total number of products  
**Example queries:**
- "How many products?"
- "Total SKUs"
- "Product count"
- "Number of items in catalog"

**Returns:** Total product count

---

## 3. 📋 ORDERS QUERIES

### `orders.status`
**What it does:** Check status of a specific order  
**Example queries:**
- "Status of order #123?"
- "Is order ORD-2024-0045 shipped?"
- "Track order"
- "Where is my order?"

**Returns:** Order status, fulfillment status, payment status, details

---

### `orders.recent`
**What it does:** View recent orders  
**Example queries:**
- "Show today's orders"
- "Recent orders"
- "Orders this week"
- "Latest orders"

**Returns:** List of recent orders (last 7 days)

---

### `orders.details`
**What it does:** Get detailed order information  
**Example queries:**
- "Order details for #123"
- "Show me order ORD-2024-0045"
- "Full order info"
- "Order breakdown"

**Returns:** Complete order details including items, customer, amounts

---

### `orders.count`
**What it does:** Get total number of orders  
**Example queries:**
- "How many orders today?"
- "Total orders this month"
- "Order count"
- "Number of orders"

**Returns:** Total order count

---

## 4. 📦 PURCHASE ORDERS QUERIES

### `purchaseorders.list`
**What it does:** View all purchase orders  
**Example queries:**
- "Show purchase orders"
- "List POs"
- "What POs do we have?"
- "Purchase order list"

**Returns:** List of purchase orders with status, supplier, expected dates

---

### `purchaseorders.status`
**What it does:** Check purchase order status  
**Example queries:**
- "Status of PO #123"
- "Is PO received?"
- "Track purchase order"
- "PO details"

**Returns:** PO status, supplier, items, delivery information

---

### `purchaseorders.stats`
**What it does:** Get purchase order statistics  
**Example queries:**
- "PO stats"
- "Purchase order metrics"
- "How many pending POs?"
- "PO summary"

**Returns:** Total POs, pending, approved, received counts, total value

---

### `purchaseorders.reorder`
**What it does:** Get reorder suggestions for low stock items  
**Example queries:**
- "What should I reorder?"
- "Reorder suggestions"
- "Items to restock"
- "What needs ordering?"

**Returns:** List of products below reorder point with suggested quantities

---

## 5. 📊 AUDITS QUERIES

### `audits.recent`
**What it does:** View recent inventory audits  
**Example queries:**
- "Recent audits"
- "Last audit"
- "Audit history"
- "Show me audits"

**Returns:** Helpful message directing to audits page (audit data coming soon)

---

### `audits.status`
**What it does:** Check audit status  
**Example queries:**
- "Status of audit #123"
- "Audit details"
- "Audit report"
- "Show audit info"

**Returns:** Helpful message directing to audits page

---

### `audits.stats`
**What it does:** Get audit statistics  
**Example queries:**
- "Audit stats"
- "How many audits?"
- "Audit metrics"
- "Audit performance"

**Returns:** Helpful message directing to audits page

---

### `audits.discrepancies`
**What it does:** View audit discrepancies  
**Example queries:**
- "Show audit discrepancies"
- "What discrepancies found?"
- "Audit issues"
- "Discrepancy report"

**Returns:** Helpful message directing to audits page

---

## 6. 🏢 SUPPLIERS QUERIES

### `suppliers.list`
**What it does:** View all suppliers  
**Example queries:**
- "List suppliers"
- "Show vendors"
- "Who are our suppliers?"
- "Supplier list"

**Returns:** List of suppliers with contact info, status, rating

---

### `suppliers.details`
**What it does:** Get detailed supplier information  
**Example queries:**
- "Supplier details for ABC Corp"
- "Tell me about supplier XYZ"
- "Supplier contact info"
- "Show supplier details"

**Returns:** Full supplier details including products, contacts, rating

---

### `suppliers.count`
**What it does:** Get total number of suppliers  
**Example queries:**
- "How many suppliers?"
- "Supplier count"
- "Number of vendors"
- "Total suppliers"

**Returns:** Total supplier count

---

## 7. 🏭 WAREHOUSES QUERIES

### `warehouses.list`
**What it does:** View all warehouses/locations  
**Example queries:**
- "List warehouses"
- "Show locations"
- "What warehouses do we have?"
- "Warehouse list"

**Returns:** List of warehouses with address, status, capacity

---

### `warehouses.details`
**What it does:** Get warehouse information  
**Example queries:**
- "Warehouse details"
- "Tell me about warehouse A"
- "Location info"
- "Show warehouse details"

**Returns:** Full warehouse details including address, type, inventory count

---

### `warehouses.stock`
**What it does:** View stock in specific warehouse  
**Example queries:**
- "Stock in warehouse A"
- "What's in location B?"
- "Warehouse inventory"
- "Show warehouse stock"

**Returns:** List of inventory items in specified warehouse

---

## 8. 👥 CUSTOMERS QUERIES

### `customers.list`
**What it does:** View all customers  
**Example queries:**
- "List customers"
- "Show clients"
- "Customer list"
- "Who are our customers?"

**Returns:** List of customers with contact info, company name

---

### `customers.details`
**What it does:** Get customer information  
**Example queries:**
- "Customer details for John"
- "Tell me about customer ABC"
- "Client info"
- "Show customer details"

**Returns:** Full customer details including contact info, address, type

---

### `customers.count`
**What it does:** Get total number of customers  
**Example queries:**
- "How many customers?"
- "Customer count"
- "Total clients"
- "Number of customers"

**Returns:** Total customer count

---

## 9. 📂 CATEGORIES & BRANDS QUERIES

### `categories.list`
**What it does:** View product categories  
**Example queries:**
- "List categories"
- "Show categories"
- "What categories do we have?"
- "Product categories"

**Returns:** List of all product categories

---

### `brands.list`
**What it does:** View product brands  
**Example queries:**
- "List brands"
- "Show brands"
- "What brands do we carry?"
- "Product brands"

**Returns:** List of all product brands

---

## 10. 💰 ANALYTICS QUERIES

### `analytics.overview`
**What it does:** Get overall business metrics  
**Example queries:**
- "Show analytics"
- "Business overview"
- "Dashboard stats"
- "KPIs"

**Returns:** Revenue, order count, average order value, order status breakdown

---

### `analytics.revenue`
**What it does:** Get revenue and financial metrics  
**Example queries:**
- "What's our revenue?"
- "Total sales"
- "Revenue this month"
- "How much did we make?"

**Returns:** Total revenue, order count, average order value

---

### `analytics.customers`
**What it does:** Get customer analytics  
**Example queries:**
- "Customer metrics"
- "Customer stats"
- "Customer analytics"
- "How many customers?"

**Returns:** Total customers, business vs. individual breakdown

---

### `analytics.products`
**What it does:** Get product analytics  
**Example queries:**
- "Product metrics"
- "Inventory analytics"
- "Product stats"
- "Product performance"

**Returns:** Total products, active products, average price

---

### `analytics.orders`
**What it does:** Get order analytics  
**Example queries:**
- "Order analytics"
- "Order metrics"
- "Sales stats"
- "Order performance"

**Returns:** Same as analytics.overview - order-focused metrics

---

### `analytics.inventory`
**What it does:** Get inventory analytics  
**Example queries:**
- "Inventory metrics"
- "Stock analytics"
- "Inventory health"
- "Stock overview"

**Returns:** Total items, quantities, available vs. reserved

---

## 11. 🧭 NAVIGATION QUERIES

### `navigation.page`
**What it does:** Navigate to specific pages in the app  
**Example queries:**
- "Open inventory page"
- "Go to dashboard"
- "Show audits"
- "Take me to suppliers"

**Supported pages:**
- Dashboard
- Inventory (products, stock, categories, suppliers, warehouses)
- Orders
- Purchase Orders
- Reports
- Audits
- Company Profile
- User Profile
- RAG Chat
- And more...

---

## 12. 📚 KNOWLEDGE QUERIES

### `knowledge.explainer`
**What it does:** Answer questions about processes, policies, SOPs  
**Example queries:**
- "How do I create a purchase order?"
- "What is the reorder process?"
- "Explain audit workflow"
- "What are our return policies?"

**Returns:** Answers from uploaded company documents (RAG-based)

---

## 🎯 Usage Tips

1. **Be specific:** Instead of "show orders", try "show today's orders" or "recent orders"
2. **Use IDs when available:** "Status of order ORD-2024-0045" is more specific than "order status"
3. **Natural language works:** You can ask questions naturally - the AI will understand
4. **Combine intents:** You can ask follow-up questions in context
5. **Use navigation:** Ask to "go to [page]" to navigate the app

---

## 🔧 Technical Details

- **Total Intent Types:** 42+
- **Server Actions Used:** All queries use server-side actions for authentication
- **Response Format:** Beautiful formatted markdown with emojis and structured data
- **Real-time Data:** All queries fetch live operational data
- **Multi-tenant:** All queries are scoped to your company ID

---

## 📝 Coming Soon

The following features are planned:
- Direct audit data fetching (currently redirects to audits page)
- PDF/DOCX document ingestion for knowledge base
- Advanced filtering options
- Export capabilities
- More analytics dashboards

---

## 💡 Example Conversations

**User:** "What's our revenue?"  
**Assistant:** 💰 **Revenue Data**
**Total Revenue:** $125,430.50
**Total Orders:** 234
**Average Order Value:** $536.24

---

**User:** "Show me low stock items"  
**Assistant:** 🚨 **Low Stock Alerts** (3 items):

⚠️ **Blue Widget** (SKU-001)
Current: 5 | Reorder Point: 20

⚠️ **Red Gadget** (SKU-045)
Current: 2 | Reorder Point: 10

---

**User:** "How many suppliers?"  
**Assistant:** 🏢 You have **47 suppliers** in your network.

---

## 🚀 Getting Started

1. Navigate to `/rag` route in your Invista app
2. Start asking questions!
3. The chatbot will classify your intent and route to the appropriate handler
4. Enjoy beautiful, formatted responses with real-time data

---

**Last Updated:** November 17, 2025  
**Version:** 2.0  
**Total Queries Supported:** 42+
