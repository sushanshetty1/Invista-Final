import OpenAI from "openai";
import type { IntentType } from "@/app/api/chat/classify/route";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const INTENT_MODEL = process.env.CHATBOT_INTENT_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

**INVENTORY**
2. inventory.lookup - User wants specific inventory info by SKU/name
   Examples: "Show me inventory for SKU-123", "What's the stock level of item X?"

3. inventory.lowstock - User wants low stock alerts
   Examples: "What's running low?", "Low stock items", "Items to reorder"

4. inventory.movements - User wants inventory movement history
   Examples: "Show inventory movements", "Stock changes for SKU-123"

5. inventory.alerts - User wants inventory alerts/notifications
   Examples: "Any inventory alerts?", "Show stock alerts"

**PRODUCTS**
6. products.list - User wants to see products
   Examples: "Show products", "List all items", "What products do we have?"

7. products.search - User searches for specific products
   Examples: "Find products with 'widget' in name", "Search for laptops"

8. products.details - User wants detailed product info
   Examples: "Product details for SKU-123", "Tell me about product X"

9. products.count - User wants product statistics
   Examples: "How many products?", "Product count", "Total items"

**ORDERS**
10. orders.status - User wants order status
    Examples: "Order status for #123", "Where is my order?"

11. orders.recent - User wants recent orders
    Examples: "Show recent orders", "Latest orders"

12. orders.details - User wants specific order details
    Examples: "Order details for #123", "Show order information"

13. orders.count - User wants order statistics
    Examples: "How many orders?", "Order count", "Total orders today"

**PURCHASE ORDERS**
14. purchaseorders.list - User wants to see purchase orders
    Examples: "Show purchase orders", "List POs"

15. purchaseorders.status - User wants PO status
    Examples: "PO status for #123", "Purchase order status"

16. purchaseorders.stats - User wants PO statistics
    Examples: "PO metrics", "Purchase order stats"

17. purchaseorders.reorder - User wants reorder suggestions
    Examples: "What should I reorder?", "Reorder suggestions"

**AUDITS**
18. audits.recent - User wants recent audits
    Examples: "Show recent audits", "Latest audit results"

19. audits.status - User wants audit status
    Examples: "Audit status", "Current audit progress"

20. audits.stats - User wants audit statistics
    Examples: "Audit metrics", "Audit summary"

21. audits.discrepancies - User wants audit discrepancies
    Examples: "Show discrepancies", "Audit issues"

**SUPPLIERS**
22. suppliers.list - User wants to see suppliers
    Examples: "Show suppliers", "List vendors"

23. suppliers.details - User wants supplier details
    Examples: "Supplier details for X", "Tell me about supplier Y"

24. suppliers.count - User wants supplier statistics
    Examples: "How many suppliers?", "Supplier count"

**WAREHOUSES**
25. warehouses.list - User wants to see warehouses
    Examples: "Show warehouses", "List locations"

26. warehouses.details - User wants warehouse details
    Examples: "Warehouse details", "Tell me about warehouse X"

27. warehouses.stock - User wants warehouse stock info
    Examples: "Stock in warehouse A", "Warehouse inventory"

**CUSTOMERS**
28. customers.list - User wants to see customers
    Examples: "Show customers", "List clients"

29. customers.details - User wants customer details
    Examples: "Customer details for X", "Tell me about customer Y"

30. customers.count - User wants customer statistics
    Examples: "How many customers?", "Customer count"

**CATEGORIES & BRANDS**
31. categories.list - User wants to see categories
    Examples: "Show categories", "Product categories"

32. brands.list - User wants to see brands
    Examples: "Show brands", "List brands"

**ANALYTICS**
33. analytics.overview - User wants general analytics
    Examples: "Show analytics", "Dashboard metrics", "Business overview"

34. analytics.revenue - User wants revenue analytics
    Examples: "Revenue stats", "Sales revenue", "Financial metrics"

35. analytics.customers - User wants customer analytics
    Examples: "Customer metrics", "Customer insights"

36. analytics.products - User wants product analytics
    Examples: "Product metrics", "Product performance"

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

export async function classifyIntent(message: string): Promise<IntentClassification> {
  try {
    if (!OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY");
      return {
        intent: "fallback" as IntentType,
        confidence: 0.3,
        parameters: {},
      };
    }

    const prompt = INTENT_CLASSIFICATION_PROMPT.replace("{{MESSAGE}}", message);

    const completion = await openai.chat.completions.create({
      model: INTENT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || "{}";
    
    try {
      const classification: IntentClassification = JSON.parse(responseText);

      // Validate the intent
      const validIntents: IntentType[] = [
        "knowledge.explainer",
        "inventory.lookup",
        "inventory.lowstock",
        "inventory.movements",
        "inventory.alerts",
        "products.list",
        "products.search",
        "products.details",
        "products.count",
        "orders.status",
        "orders.recent",
        "orders.details",
        "orders.count",
        "purchaseorders.list",
        "purchaseorders.status",
        "purchaseorders.stats",
        "purchaseorders.reorder",
        "audits.recent",
        "audits.status",
        "audits.stats",
        "audits.discrepancies",
        "suppliers.list",
        "suppliers.details",
        "suppliers.count",
        "warehouses.list",
        "warehouses.details",
        "warehouses.stock",
        "customers.list",
        "customers.details",
        "customers.count",
        "categories.list",
        "brands.list",
        "analytics.overview",
        "analytics.revenue",
        "analytics.customers",
        "analytics.products",
        "analytics.orders",
        "analytics.inventory",
        "navigation.page",
        "fallback",
      ];

      if (!validIntents.includes(classification.intent)) {
        classification.intent = "fallback";
        classification.confidence = 0.5;
      }

      return classification;
    } catch (parseError) {
      console.error("Failed to parse intent classification:", parseError);
      return {
        intent: "fallback" as IntentType,
        confidence: 0.3,
        parameters: {},
      };
    }
  } catch (error) {
    console.error("Intent classification error:", error);
    return {
      intent: "fallback" as IntentType,
      confidence: 0.3,
      parameters: {},
    };
  }
}
