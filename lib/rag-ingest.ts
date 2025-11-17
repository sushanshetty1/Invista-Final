import { Client } from "pg";
import OpenAI from "openai";
import dotenv from "dotenv";
import { supabase } from "./supabaseClient";

dotenv.config();

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHUNK_MAX_CHARS = Number(process.env.RAG_CHUNK_MAX_CHARS ?? "1000");

const client = new Client({ connectionString: NEON_DATABASE_URL });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function chunkText(text: string, maxChars = CHUNK_MAX_CHARS) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";
  for (const p of paragraphs) {
    if ((buffer + "\n\n" + p).length > maxChars) {
      if (buffer) chunks.push(buffer.trim());
      buffer = p;
    } else {
      buffer = buffer ? buffer + "\n\n" + p : p;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks;
}

async function embedText(text: string) {
  const resp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return resp.data[0].embedding as number[];
}

async function getCompanyData(companyId: string) {
  // Query company profile from Supabase
  const { data: profile, error: profileError } = await supabase
    .from('companies')
    .select('name, description, industry, website, address, email, phone, size, business_type')
    .eq('id', companyId)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch company profile: ${profileError.message}`);
  }

  await client.connect();

  // Query inventory summary from Neon
  const inventoryQuery = `SELECT COUNT(*) as total_products, SUM(quantity) as total_stock FROM inventory WHERE company_id = $1`;
  const inventoryRes = await client.query(inventoryQuery, [companyId]);
  const inventory = inventoryRes.rows[0];

  // Query top inventory items from Neon
  const topInventoryQuery = `SELECT name, quantity, selling_price FROM inventory WHERE company_id = $1 ORDER BY quantity DESC LIMIT 10`;
  const topInventoryRes = await client.query(topInventoryQuery, [companyId]);
  const topInventory = topInventoryRes.rows;

  // Query orders summary from Neon
  const ordersQuery = `SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders WHERE company_id = $1`;
  const ordersRes = await client.query(ordersQuery, [companyId]);
  const orders = ordersRes.rows[0];

  await client.end();

  // Generate text
  const text = `
Company Profile:
Name: ${profile?.name || 'N/A'}
Description: ${profile?.description || 'N/A'}
Industry: ${profile?.industry || 'N/A'}
Website: ${profile?.website || 'N/A'}
Address: ${JSON.stringify(profile?.address) || 'N/A'}
Email: ${profile?.email || 'N/A'}
Phone: ${profile?.phone || 'N/A'}
Size: ${profile?.size || 'N/A'}
Business Type: ${profile?.business_type || 'N/A'}

Inventory Summary:
Total Products: ${inventory?.total_products || 0}
Total Stock Quantity: ${inventory?.total_stock || 0}

Top Inventory Items:
${topInventory.map((item: any) => `- ${item.name}: ${item.quantity} units at $${item.selling_price}`).join('\n')}

Orders Summary:
Total Orders: ${orders?.total_orders || 0}
Total Revenue: ${orders?.total_revenue || 0}
  `.trim();

  return text;
}

export async function ingestCompanyData(companyId: string) {
  try {
    const companyData = await getCompanyData(companyId);
    const chunks = chunkText(companyData, 1000);

    await client.connect();

    // Delete existing data for the company
    await client.query(`DELETE FROM rag_documents WHERE tenant_id = $1`, [companyId]);

    let totalInserted = 0;
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await embedText(content);
      if (!embedding || embedding.length === 0) continue;

      const embeddingLiteral = "[" + embedding.join(",") + "]";
      const insertSQL = `INSERT INTO rag_documents (source, chunk_index, content, embedding, tenant_id) VALUES ($1, $2, $3, $4::vector, $5)`;
      await client.query(insertSQL, [`company-data-${companyId}`, i, content, embeddingLiteral, companyId]);
      totalInserted++;
    }

    await client.end();
    return { success: true, inserted: totalInserted };
  } catch (error) {
    console.error("Ingestion error:", error);
    return { success: false, error: (error as Error).message };
  }
}