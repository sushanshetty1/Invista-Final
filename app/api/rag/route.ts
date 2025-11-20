import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";
import { Client } from "pg";
import OpenAI from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";

dotenv.config();

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL as string;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM ?? "1536");
const LLM_MODEL = process.env.OPENAI_LLM_MODEL ?? "gpt-4o-mini";

if (!NEON_DATABASE_URL || !OPENAI_API_KEY) {
  // We'll still export the handler; runtime will error if env missing
  console.warn("RAG route: missing NEON_DATABASE_URL or OPENAI_API_KEY env vars");
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const query = (body?.query ?? "").trim();
  const topK = Number(body?.topK ?? 7); // Increased for more comprehensive context
  const companyId = body?.companyId;
  const conversationHistory = body?.conversationHistory || []; // Support conversation memory

  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  if (!companyId) return NextResponse.json({ error: "Missing companyId" }, { status: 400 });

  // Check for gibberish/nonsensical input before processing
  const isGibberish = /^[a-z]{6,}$/.test(query.toLowerCase()) && !query.includes(' ');
  if (isGibberish || query.length < 3) {
    return NextResponse.json({ 
      answer: "I don't understand. Could you please rephrase your question?",
      sources: [] 
    });
  }

  await ensureConnected();

  // 1) create embedding for the query
  const embResp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: query });
  const qEmbedding = embResp.data[0].embedding as number[];
  const embLiteral = "[" + qEmbedding.join(",") + "]";

  // 2) nearest neighbor search in pgvector
  // Note: pgvector operator used here is '<->' (distance). Adjust if your extension expects another operator.
  const sql = `
    SELECT id, source, chunk_index, content, embedding
    FROM rag_documents
    WHERE tenant_id = $2
    ORDER BY embedding <-> '${embLiteral}'::vector
    LIMIT $1
  `;
  const res = await client.query(sql, [topK, companyId]);

  const rows = res.rows.map((r: any) => ({ id: r.id, source: r.source, chunk_index: r.chunk_index, content: r.content }));

  // 3) assemble prompt using LangChain PromptTemplate + call LLM (LangChain wrapper)
  const contextText = rows.map((r: any, idx: number) => `SOURCE ${idx + 1} (${r.source}#${r.chunk_index}):\n${r.content}`).join("\n\n---\n\n");

  // Build conversation context
  let conversationContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = "\n\nPREVIOUS CONVERSATION:\n" + 
      conversationHistory.slice(-6).map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join("\n") + 
      "\n";
  }

  const promptTemplate = `You are a professional AI assistant for an inventory management system.

CRITICAL RULE: First check if the user's question makes sense.
- If the input is gibberish, random characters, unclear, or nonsensical (like "shdcsdc", "asdfgh", random typing), respond with ONLY: "I don't understand. Could you please rephrase your question?"
- DO NOT answer with company data, summaries, or structured responses if the question is unclear
- DO NOT try to be helpful by providing information the user didn't ask for
- Only answer with data when the question is clear and specific

CONTEXT:
{context}{conversationContext}

QUESTION: {question}

Answer:`;

  const prompt = promptTemplate
    .replace("{context}", contextText)
    .replace("{conversationContext}", conversationContext)
    .replace("{question}", query);

  // LangChain LLM wrapper — this uses the LangChain OpenAI LLM behind the scenes
  const llm = new ChatOpenAI({ openAIApiKey: OPENAI_API_KEY, modelName: LLM_MODEL, streaming: true, temperature: 0.5 });

  // Create a readable stream for the response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // First, send the sources
        const sourcesData = JSON.stringify({ sources: rows });
        controller.enqueue(`data: ${sourcesData}\n\n`);

        // Then stream the LLM response
        let fullAnswer = '';
        const llmStream = await llm.stream([new HumanMessage(prompt)]);
        
        for await (const chunk of llmStream) {
          if (chunk.content) {
            fullAnswer += chunk.content;
            const answerData = JSON.stringify({ answer: fullAnswer, done: false });
            controller.enqueue(`data: ${answerData}\n\n`);
          }
        }

        // Send final done signal
        const finalData = JSON.stringify({ answer: fullAnswer, done: true });
        controller.enqueue(`data: ${finalData}\n\n`);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
