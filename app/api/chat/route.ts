import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import OpenAI from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import type { IntentType } from "./classify/route";
import { handleLiveDataQuery } from "@/lib/chat-query-handlers";
import { findNavigationIntent } from "@/lib/navigation-map";

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL as string;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const LLM_MODEL = process.env.OPENAI_LLM_MODEL ?? "gpt-4o-mini";
const DEFAULT_TOP_K = Number(process.env.RAG_DEFAULT_TOP_K ?? "3");
const LLM_TEMPERATURE = Number(process.env.RAG_LLM_TEMPERATURE ?? "0");
const LLM_STREAMING = process.env.RAG_LLM_STREAMING === "true";
const PROMPT_TEMPLATE = process.env.RAG_PROMPT_TEMPLATE ?? 
  "You are a helpful assistant for company data. Answer ONLY based on the provided context. Do not use external knowledge or make assumptions.";

if (!NEON_DATABASE_URL || !OPENAI_API_KEY) {
  console.warn("Chat route: missing NEON_DATABASE_URL or OPENAI_API_KEY env vars");
}

const client = new Client({ connectionString: NEON_DATABASE_URL });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function ensureConnected() {
  try {
    if ((client as any)._connected) return;
    await client.connect();
    (client as any)._connected = true;
  } catch (e) {
    // ignore
  }
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  message: string;
  companyId: string;
  history?: ChatMessage[];
};

/**
 * Handle knowledge.explainer intent - use RAG
 */
async function handleKnowledgeQuery(
  query: string,
  companyId: string,
  topK = DEFAULT_TOP_K
) {
  await ensureConnected();

  // 1) Create embedding for the query
  const embResp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: query });
  const qEmbedding = embResp.data[0].embedding as number[];
  const embLiteral = "[" + qEmbedding.join(",") + "]";

  // 2) Nearest neighbor search in pgvector
  const sql = `
    SELECT id, source, chunk_index, content, metadata
    FROM rag_documents
    WHERE tenant_id = $2
    ORDER BY embedding <-> '${embLiteral}'::vector
    LIMIT $1
  `;
  const res = await client.query(sql, [topK, companyId]);

  const rows = res.rows.map((r: any) => ({
    id: r.id,
    source: r.source,
    chunk_index: r.chunk_index,
    content: r.content,
    metadata: r.metadata,
  }));

  return rows;
}

/**
 * Generate LLM response with context
 */
async function generateResponse(
  query: string,
  context: string,
  history?: ChatMessage[]
) {
  const promptTemplate = `You are a professional AI assistant for inventory management. Provide clear, well-formatted responses.

CONTEXT:
{context}

QUESTION: {question}

Provide a clear, structured response based on the available data. Use proper formatting and be specific when referencing information.`;

  const prompt = promptTemplate
    .replace("{context}", context)
    .replace("{question}", query);

  const llm = new ChatOpenAI({
    openAIApiKey: OPENAI_API_KEY,
    modelName: LLM_MODEL,
    streaming: LLM_STREAMING,
    temperature: 0.5,
  });

  // Include conversation history if provided
  const messages: any[] = [];
  
  if (history && history.length > 0) {
    // Add recent history (limit to last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push(
        msg.role === "user"
          ? new HumanMessage(msg.content)
          : { role: "assistant", content: msg.content }
      );
    }
  }

  messages.push(new HumanMessage(prompt));

  return { llm, messages };
}

/**
 * Provide navigation guidance for "where should I go" questions
 */
function getNavigationGuidance(message: string): { answer: string; action: any } | null {
  const lowerMsg = message.toLowerCase();
  
  // Check if it's a question asking about where to go/find something
  // Patterns: "where should i go", "where do i go", "where can i", "...where should i"
  const hasWhereKeyword = lowerMsg.includes("where");
  const hasNavigationIntent = lowerMsg.includes("should i go") || 
    lowerMsg.includes("do i go") || lowerMsg.includes("can i go") ||
    lowerMsg.includes("should i") || lowerMsg.includes("do i") ||
    lowerMsg.includes("can i find") || lowerMsg.includes("to find");

  // Must have either "where" or clear navigation intent words
  if (!hasWhereKeyword && !hasNavigationIntent) return null;

  // Product related (including common typos)
  if (lowerMsg.includes("product") || lowerMsg.includes("produt") || 
      lowerMsg.includes("item") || lowerMsg.includes("catalog")) {
    return {
      answer: "📦 To manage products, go to **Inventory → Products**. There you can:\n\n• View all products\n• Add new products\n• Edit product details\n• Manage product variants\n• Update pricing and stock levels",
      action: null
    };
  }

  // Orders
  if (lowerMsg.includes("order") && !lowerMsg.includes("purchase")) {
    return {
      answer: "📋 To manage orders, go to **Orders**. There you can:\n\n• View all orders\n• Create new orders\n• Update order status\n• Track fulfillment\n• Manage customer orders",
      action: null
    };
  }

  // Purchase Orders
  if (lowerMsg.includes("purchase order") || lowerMsg.includes("po ")) {
    return {
      answer: "📦 To manage purchase orders, go to **Purchase Orders**. There you can:\n\n• View all POs\n• Create new purchase orders\n• Track deliveries\n• Manage supplier orders\n• Receive goods",
      action: null
    };
  }

  // Inventory/Stock
  if (lowerMsg.includes("inventory") || lowerMsg.includes("stock")) {
    return {
      answer: "📊 To manage inventory, go to **Inventory → Stock**. There you can:\n\n• View stock levels\n• Check warehouse quantities\n• Transfer stock\n• Adjust inventory\n• Monitor stock movements",
      action: null
    };
  }

  // Suppliers
  if (lowerMsg.includes("supplier") || lowerMsg.includes("vendor")) {
    return {
      answer: "🏢 To manage suppliers, go to **Inventory → Suppliers**. There you can:\n\n• View all suppliers\n• Add new suppliers\n• Update supplier info\n• Manage contacts\n• Track supplier performance",
      action: null
    };
  }

  // Warehouses
  if (lowerMsg.includes("warehouse") || lowerMsg.includes("location")) {
    return {
      answer: "🏭 To manage warehouses, go to **Inventory → Warehouses**. There you can:\n\n• View all locations\n• Add new warehouses\n• Manage warehouse details\n• Track inventory by location",
      action: null
    };
  }

  // Audits
  if (lowerMsg.includes("audit")) {
    return {
      answer: "📊 To manage audits, go to **Audits**. There you can:\n\n• View audit history\n• Create new audits\n• Track audit progress\n• Review discrepancies\n• Generate audit reports",
      action: null
    };
  }

  // Reports/Analytics
  if (lowerMsg.includes("report") || lowerMsg.includes("analytic") || lowerMsg.includes("dashboard")) {
    return {
      answer: "📈 To view reports and analytics:\n\n• **Dashboard** - Overview and key metrics\n• **Reports** - Detailed reports and insights",
      action: null
    };
  }

  return null;
}

/**
 * Main POST handler for chat
 */
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const message = (body?.message ?? "").trim();
    const companyId = body?.companyId;
    const history = body?.history || [];

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    // Step 1: Classify intent
    const classifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chat/classify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }
    );

    if (!classifyResponse.ok) {
      throw new Error("Failed to classify intent");
    }

    const classification = await classifyResponse.json();
    const intent: IntentType = classification.intent;
    const parameters = classification.parameters || {};

    // Step 2: Route based on intent
    let responseData: any = {
      intent,
      sources: [],
      answer: "",
      action: null,
    };

    // Navigation intent
    if (intent === "navigation.page") {
      const pageName = parameters.page || message;
      const navigationIntent = findNavigationIntent(String(pageName));

      if (navigationIntent) {
        responseData.action = {
          type: "navigate",
          url: navigationIntent.url,
        };
        responseData.answer = `I'll take you to the ${navigationIntent.page} page.`;
        return NextResponse.json(responseData);
      } else {
        responseData.answer = "I couldn't find that page. Try asking for 'dashboard', 'inventory', 'orders', or 'reports'.";
        return NextResponse.json(responseData);
      }
    }

    // Live data queries - all operational data intents
    const liveDataIntents: IntentType[] = [
      // Inventory
      "inventory.lookup",
      "inventory.lowstock",
      "inventory.movements",
      "inventory.alerts",
      // Products
      "products.list",
      "products.search",
      "products.details",
      "products.count",
      // Orders
      "orders.status",
      "orders.recent",
      "orders.details",
      "orders.count",
      // Purchase orders
      "purchaseorders.list",
      "purchaseorders.status",
      "purchaseorders.stats",
      "purchaseorders.reorder",
      // Audits
      "audits.recent",
      "audits.status",
      "audits.stats",
      "audits.discrepancies",
      // Suppliers
      "suppliers.list",
      "suppliers.details",
      "suppliers.count",
      // Warehouses
      "warehouses.list",
      "warehouses.details",
      "warehouses.stock",
      // Customers
      "customers.list",
      "customers.details",
      "customers.count",
      // Categories & Brands
      "categories.list",
      "brands.list",
      // Analytics
      "analytics.overview",
      "analytics.revenue",
      "analytics.customers",
      "analytics.products",
      "analytics.orders",
      "analytics.inventory",
    ];

    if (liveDataIntents.includes(intent)) {
      const queryResult = await handleLiveDataQuery(intent, parameters, companyId);

      if (queryResult.success) {
        responseData.answer = queryResult.formatted || "Query executed successfully.";
        responseData.data = queryResult.data;
        return NextResponse.json(responseData);
      } else {
        responseData.answer = `Sorry, I encountered an error: ${queryResult.error}`;
        return NextResponse.json(responseData);
      }
    }

    // Knowledge query - use RAG
    if (intent === "knowledge.explainer") {
      // Check if this is a "where should I go" type question - provide navigation guidance
      const navigationGuidance = getNavigationGuidance(message);
      if (navigationGuidance) {
        responseData.answer = navigationGuidance.answer;
        responseData.action = navigationGuidance.action;
        return NextResponse.json(responseData);
      }

      const sources = await handleKnowledgeQuery(message, companyId);

      if (!sources || sources.length === 0) {
        responseData.answer = "I don't have any documentation on that topic yet. You can upload relevant documents to the knowledge base, or try asking me to perform the action directly (e.g., 'list products' instead of 'how do I list products').";
        return NextResponse.json(responseData);
      }

      responseData.sources = sources;

      const contextText = sources
        .map(
          (r: any, idx: number) =>
            `SOURCE ${idx + 1} (${r.source}#${r.chunk_index}):\n${r.content}`
        )
        .join("\n\n---\n\n");

      // Generate streaming response
      const { llm, messages } = await generateResponse(message, contextText, history);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // First, send the sources
            const sourcesData = JSON.stringify({ sources, intent });
            controller.enqueue(`data: ${sourcesData}\n\n`);

            // Then stream the LLM response
            let fullAnswer = "";
            const llmStream = await llm.stream(messages);

            for await (const chunk of llmStream) {
              if (chunk.content) {
                fullAnswer += chunk.content;
                const answerData = JSON.stringify({ answer: fullAnswer, done: false });
                controller.enqueue(`data: ${answerData}\n\n`);
              }
            }

            // Send final done signal
            const finalData = JSON.stringify({ answer: fullAnswer, done: true, intent });
            controller.enqueue(`data: ${finalData}\n\n`);
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // For any unhandled intent, check if it's a simple greeting first
    const lowerMessage = message.toLowerCase().trim();
    const simpleGreetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    
    if (simpleGreetings.includes(lowerMessage)) {
      responseData.answer = "Hi! How can I help you today?";
      return NextResponse.json(responseData);
    }

    // For other fallback queries, try RAG
    const sources = await handleKnowledgeQuery(message, companyId);
    
    if (sources && sources.length > 0) {
      responseData.sources = sources;
      const contextText = sources
        .map((r: any, idx: number) => `SOURCE ${idx + 1} (${r.source}#${r.chunk_index}):\n${r.content}`)
        .join("\n\n---\n\n");

      const { llm, messages } = await generateResponse(message, contextText, history);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const sourcesData = JSON.stringify({ sources, intent });
            controller.enqueue(`data: ${sourcesData}\n\n`);

            let fullAnswer = "";
            const llmStream = await llm.stream(messages);

            for await (const chunk of llmStream) {
              if (chunk.content) {
                fullAnswer += chunk.content;
                const answerData = JSON.stringify({ answer: fullAnswer, done: false });
                controller.enqueue(`data: ${answerData}\n\n`);
              }
            }

            const finalData = JSON.stringify({ answer: fullAnswer, done: true, intent });
            controller.enqueue(`data: ${finalData}\n\n`);
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // If no sources available, provide a helpful response
    responseData.answer = "I can help you with inventory, orders, products, suppliers, customers, and more. What would you like to know?";
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message", details: (error as Error).message },
      { status: 500 }
    );
  }
}
