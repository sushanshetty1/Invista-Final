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

// Fuzzy matching and typo correction
function preprocessMessage(message: string): string {
  let processed = message.toLowerCase().trim();
  
  // Common typos and variations
  const corrections: Record<string, string> = {
    // Products
    'prodcuts': 'products',
    'pruducts': 'products',
    'prducts': 'products',
    'itmes': 'items',
    'iteams': 'items',
    'inventry': 'inventory',
    'inventroy': 'inventory',
    'inventary': 'inventory',
    
    // Actions
    'shwo': 'show',
    'hsow': 'show',
    'dispaly': 'display',
    'dsiplay': 'display',
    'lsit': 'list',
    'serach': 'search',
    'seach': 'search',
    'fnd': 'find',
    'gt': 'get',
    
    // Orders
    'oders': 'orders',
    'ordes': 'orders',
    'ordrs': 'orders',
    'pruchase': 'purchase',
    'puchase': 'purchase',
    'purchse': 'purchase',
    
    // Stock
    'stok': 'stock',
    'stck': 'stock',
    'reoder': 'reorder',
    'reordr': 'reorder',
    
    // Suppliers
    'supliers': 'suppliers',
    'suppiers': 'suppliers',
    'suplier': 'supplier',
    'vender': 'vendor',
    'vendrs': 'vendors',
    
    // Warehouses
    'werehouse': 'warehouse',
    'warehose': 'warehouse',
    'warehoue': 'warehouse',
    
    // Customers
    'custmers': 'customers',
    'costumers': 'customers',
    'customrs': 'customers',
    'clents': 'clients',
    
    // Common words
    'waht': 'what',
    'whta': 'what',
    'hwo': 'how',
    'teh': 'the',
    'adn': 'and',
    'recnt': 'recent',
    'rcent': 'recent',
    'laest': 'latest',
    'dtails': 'details',
    'detials': 'details',
    'statstics': 'statistics',
    'statsitics': 'statistics',
  };
  
  // Split into words and correct each
  const words = processed.split(/\s+/);
  const correctedWords = words.map(word => {
    // Check exact matches
    if (corrections[word]) {
      return corrections[word];
    }
    
    // Check if word contains common typo patterns
    for (const [typo, correct] of Object.entries(corrections)) {
      if (word.includes(typo)) {
        return word.replace(typo, correct);
      }
    }
    
    return word;
  });
  
  processed = correctedWords.join(' ');
  
  // Synonyms and alternative phrasings
  const synonyms: [RegExp, string][] = [
    [/\b(items?|goods|stuff)\b/g, 'products'],
    [/\b(display|show me|get me|fetch)\b/g, 'show'],
    [/\b(clients?)\b/g, 'customers'],
    [/\b(vendors?)\b/g, 'suppliers'],
    [/\b(locations?|facilities)\b/g, 'warehouses'],
    [/\b(running low|almost out|getting low)\b/g, 'low stock'],
    [/\b(what do i have|what have i got|my stuff)\b/g, 'list products'],
    [/\b(recent|latest|new)\s+(orders?|purchases?)\b/g, 'recent orders'],
    [/\b(how many|count|total number of)\b/g, 'count'],
    [/\b(analytics?|metrics?|stats|statistics)\b/g, 'analytics'],
    [/\b(company name|business name|organization name|my company|company info|company details|business info)\b/g, 'what is my company name'],
    [/\b(who am i|my business|my organization)\b/g, 'what is my company'],
  ];
  
  for (const [pattern, replacement] of synonyms) {
    processed = processed.replace(pattern, replacement);
  }
  
  return processed;
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Fuzzy match against known keywords
function fuzzyMatchKeywords(message: string): string | null {
  const keywords = [
    'products', 'inventory', 'orders', 'suppliers', 'customers',
    'warehouses', 'purchase orders', 'audits', 'analytics',
    'stock', 'reorder', 'low stock', 'categories', 'brands'
  ];
  
  const words = message.split(/\s+/);
  
  for (const word of words) {
    if (word.length < 3) continue;
    
    for (const keyword of keywords) {
      const distance = levenshteinDistance(word, keyword);
      const similarity = 1 - (distance / Math.max(word.length, keyword.length));
      
      // If 70% or more similar, consider it a match
      if (similarity >= 0.7) {
        return keyword;
      }
    }
  }
  
  return null;
}

const INTENT_CLASSIFICATION_PROMPT = `You are an advanced NLP-powered intent classifier for an inventory management chatbot. Use natural language understanding to classify user messages into intents and extract relevant entities.

**NATURAL LANGUAGE PATTERNS:**
- Understand synonyms: "products" = "items" = "goods" = "inventory items"
- Handle variations: "show me", "display", "list", "get", "what are", "I want to see"
- Extract entities: SKUs, product names, numbers, dates, status values
- Handle typos and informal language
- Understand context: "what do I have" → products.list, "low on stock" → inventory.lowstock

**CRITICAL DISTINCTION:**
- If user asks "HOW to do X", "WHAT should I do", "HOW do I", "STEPS to" → knowledge.explainer
- If user commands "DO X", "SHOW me X", "LIST X" (without asking how) → action intent

**ENTITY EXTRACTION:**
Extract and include in parameters:
- Product identifiers: SKU codes, product names, barcodes
- Order numbers: #123, ORD-456, order 789
- Quantities: numbers with units (10 units, 5kg, $100)
- Status values: active, pending, completed, shipped
- Dates: today, yesterday, last week, 2024-01-15
- Search terms: keywords for filtering/searching

**KNOWLEDGE & HELP**
1. knowledge.explainer - How-to questions, process explanations, company info
   Patterns: "how do i", "what should i", "steps to", "explain", "tell me about", "what is", "who is", "company info", "company name", "my company", "business name", "organization"
   Examples: 
   - "How do I create a purchase order?"
   - "What's the reorder process?"
   - "Tell me about my company"
   - "What is my company name?"
   - "Company name"
   - "Business info"
   - "Who am I?"
   - "If I want to list products what should I do?"
   
**INVENTORY**
2. inventory.lookup - Specific inventory queries with SKU/name
   Patterns: "inventory for", "stock level of", "how much [product]"
   Extract: {"sku": "...", "productName": "..."}

3. inventory.lowstock - Low stock alerts and warnings
   Patterns: "running low", "low stock", "need to reorder", "stock alerts", "items below minimum"
   
4. inventory.movements - Stock movement history
   Patterns: "movements", "stock changes", "inventory history", "who moved"
   Extract: {"sku": "...", "period": "..."}

5. inventory.alerts - General inventory notifications
   Patterns: "alerts", "notifications", "warnings", "issues"

**PRODUCTS**
6. products.list - Display products (THE MAIN ONE!)
   Patterns: "show products", "list items", "what products", "display goods", "all items", "my inventory", "what do i have", "my products", "items i have"
   Extract: {"limit": number, "category": "...", "status": "..."}

7. products.search - Search with keywords/filters
   Patterns: "find", "search for", "looking for", "products with", "contains"
   Extract: {"searchTerm": "...", "filters": {...}}

8. products.details - Detailed info about specific product
   Patterns: "details of", "information about", "tell me about [product]", "specs for"
   Extract: {"sku": "...", "productName": "..."}

9. products.count - Product statistics
   Patterns: "how many products", "total items", "product count", "number of"

**ORDERS**
10. orders.status - Order tracking and status
    Patterns: "where is order", "order status", "track order", "status of"
    Extract: {"orderNumber": "..."}

11. orders.recent - Recent orders list
    Patterns: "recent orders", "latest orders", "show orders", "my orders", "order history"
    Extract: {"limit": number, "period": "..."}

12. orders.details - Specific order information
    Patterns: "order details", "info about order", "show order [number]"
    Extract: {"orderNumber": "..."}

13. orders.count - Order statistics
    Patterns: "how many orders", "order count", "total orders", "orders today"
    Extract: {"period": "..."}

**PURCHASE ORDERS**
14. purchaseorders.list - Display purchase orders
    Patterns: "show POs", "purchase orders", "list POs"

15. purchaseorders.status - PO tracking
    Patterns: "PO status", "purchase order status"
    Extract: {"poNumber": "..."}

16. purchaseorders.stats - PO analytics
    Patterns: "PO metrics", "purchase order stats"

17. purchaseorders.reorder - Reorder suggestions
    Patterns: "what to reorder", "reorder suggestions", "items to buy"

**AUDITS**
18. audits.recent - Recent audits
19. audits.status - Audit status
20. audits.stats - Audit statistics
21. audits.discrepancies - Audit issues

**SUPPLIERS**
22. suppliers.list - Display suppliers
    Patterns: "show suppliers", "list vendors", "my suppliers"
23. suppliers.details - Supplier information
24. suppliers.count - Supplier statistics

**WAREHOUSES**
25. warehouses.list - Display warehouses
26. warehouses.details - Warehouse information
27. warehouses.stock - Warehouse inventory

**CUSTOMERS**
28. customers.list - Display customers
29. customers.details - Customer information
30. customers.count - Customer statistics

**CATEGORIES & BRANDS**
31. categories.list - Product categories
32. brands.list - Product brands

**ANALYTICS**
33. analytics.overview - Dashboard/overview
34. analytics.revenue - Revenue metrics
35. analytics.customers - Customer analytics
36. analytics.products - Product performance
37. analytics.orders - Order analytics
38. analytics.inventory - Inventory health

**NAVIGATION**
39. navigation.page - Navigate to page
    Patterns: "open [page]", "go to [page]", "show [page] page"
    Extract: {"page": "inventory|dashboard|orders|etc"}

40. fallback - Greetings, unclear, or unclassifiable
    Patterns: "hello", "hi", "help", "what can you do"

Respond ONLY with valid JSON:
{
  "intent": "intent.type",
  "confidence": 0.95,
  "parameters": {"extracted": "entities"}
}

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

    // Preprocess message for typo correction and synonym replacement
    const processedMessage = preprocessMessage(message);
    console.log("[NLP] Original:", message);
    console.log("[NLP] Processed:", processedMessage);
    
    // Quick pattern matching for common queries (bypass GPT for speed)
    const lowerProcessed = processedMessage.toLowerCase();
    
    // Company/business info queries
    if (/(company|business|organization) (name|info|detail|profile)|what is my company|who am i/i.test(lowerProcessed)) {
      console.log("[NLP] Quick match: company info → knowledge.explainer");
      return {
        intent: "knowledge.explainer" as IntentType,
        confidence: 0.95,
        parameters: { topic: "company" },
      };
    }
    
    // Product listing
    if (/(list|show|display|get) (products|items|inventory)|what (products|items) do|my (products|items)/i.test(lowerProcessed)) {
      console.log("[NLP] Quick match: list products → products.list");
      return {
        intent: "products.list" as IntentType,
        confidence: 0.95,
        parameters: {},
      };
    }
    
    // Low stock
    if (/(low stock|running low|almost out|need to reorder)/i.test(lowerProcessed)) {
      console.log("[NLP] Quick match: low stock → inventory.lowstock");
      return {
        intent: "inventory.lowstock" as IntentType,
        confidence: 0.95,
        parameters: {},
      };
    }
    
    // Recent orders
    if (/(recent|latest) orders?|show orders|my orders/i.test(lowerProcessed)) {
      console.log("[NLP] Quick match: recent orders → orders.recent");
      return {
        intent: "orders.recent" as IntentType,
        confidence: 0.95,
        parameters: {},
      };
    }
    
    // Try fuzzy matching for quick intent resolution
    const fuzzyMatch = fuzzyMatchKeywords(processedMessage);
    if (fuzzyMatch) {
      console.log("[NLP] Fuzzy matched keyword:", fuzzyMatch);
    }

    const prompt = INTENT_CLASSIFICATION_PROMPT.replace("{{MESSAGE}}", processedMessage);

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
