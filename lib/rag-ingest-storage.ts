// Enhanced RAG ingestion with Supabase Storage support
import { Client } from "pg";
import OpenAI from "openai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHUNK_MAX_CHARS = Number(process.env.RAG_CHUNK_MAX_CHARS ?? "1000");

// Create Supabase client with service role for storage access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export type DocumentMetadata = {
  version?: string;
  roleAccess?: string[]; // Array of roles that can access this document
  category?: string; // SOP, manual, policy, FAQ, workflow, etc.
  lastUpdated?: string;
  author?: string;
  tags?: string[];
};

export type IngestionOptions = {
  companyId: string;
  bucketName?: string;
  folderPath?: string;
  metadata?: DocumentMetadata;
};

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

/**
 * Extract text from different file formats
 */
async function extractTextFromFile(
  fileContent: Uint8Array,
  fileName: string
): Promise<string> {
  const extension = fileName.split(".").pop()?.toLowerCase();

  // Convert to string for text-based formats
  const textContent = new TextDecoder().decode(fileContent);

  switch (extension) {
    case "txt":
    case "md":
    case "markdown":
      return textContent;

    case "json":
      try {
        const json = JSON.parse(textContent);
        return JSON.stringify(json, null, 2);
      } catch {
        return textContent;
      }

    case "html":
    case "htm":
      // Basic HTML tag stripping
      return textContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    case "csv":
      return textContent;

    // TODO: Add support for PDF, DOCX, etc. using appropriate libraries
    default:
      return textContent;
  }
}

/**
 * Fetch documents from Supabase Storage and ingest them
 */
export async function ingestFromSupabaseStorage(
  options: IngestionOptions
): Promise<{ success: boolean; inserted: number; error?: string }> {
  const { companyId, bucketName = "company-documents", folderPath = "", metadata = {} } = options;

  try {
    const client = new Client({ connectionString: NEON_DATABASE_URL });
    await client.connect();

    // List files in the bucket/folder
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list(folderPath ? `${companyId}/${folderPath}` : companyId);

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      return { success: true, inserted: 0, error: "No files found in storage" };
    }

    let totalInserted = 0;

    for (const file of files) {
      if (file.name === ".emptyFolderPlaceholder") continue;

      const filePath = folderPath
        ? `${companyId}/${folderPath}/${file.name}`
        : `${companyId}/${file.name}`;

      // Download file
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError || !fileData) {
        console.error(`Failed to download ${file.name}:`, downloadError);
        continue;
      }

      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const fileContent = new Uint8Array(arrayBuffer);

      // Extract text
      const text = await extractTextFromFile(fileContent, file.name);

      if (!text || text.trim().length === 0) {
        console.warn(`No text content extracted from ${file.name}`);
        continue;
      }

      // Chunk and embed
      const chunks = chunkText(text);

      for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i];
        const embedding = await embedText(content);
        if (!embedding || embedding.length === 0) continue;

        const embeddingLiteral = "[" + embedding.join(",") + "]";
        
        const docMetadata = {
          ...metadata,
          fileName: file.name,
          filePath,
          chunkIndex: i,
          totalChunks: chunks.length,
          ingestedAt: new Date().toISOString(),
        };

        const insertSQL = `
          INSERT INTO rag_documents (source, chunk_index, content, embedding, tenant_id, metadata) 
          VALUES ($1, $2, $3, $4::vector, $5, $6)
        `;
        
        await client.query(insertSQL, [
          file.name,
          i,
          content,
          embeddingLiteral,
          companyId,
          JSON.stringify(docMetadata),
        ]);
        
        totalInserted++;
      }
    }

    await client.end();
    return { success: true, inserted: totalInserted };
  } catch (error) {
    console.error("Ingestion from Supabase Storage error:", error);
    return { success: false, inserted: 0, error: (error as Error).message };
  }
}

/**
 * Ingest company operational data (legacy function - now calls live APIs)
 */
export async function ingestCompanyData(companyId: string) {
  try {
    // For operational data, we now use live API queries instead of RAG
    // This function is kept for backward compatibility but redirects to ingestFromSupabaseStorage
    console.warn(
      "ingestCompanyData is deprecated for operational data. Use live API queries instead."
    );
    console.log("Use ingestFromSupabaseStorage for static documents like SOPs and manuals.");

    return {
      success: true,
      inserted: 0,
      message: "Operational data should be queried via live APIs, not RAG.",
    };
  } catch (error) {
    console.error("Ingestion error:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Delete documents by company ID or specific source
 */
export async function deleteRagDocuments(
  companyId: string,
  source?: string
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const client = new Client({ connectionString: NEON_DATABASE_URL });
    await client.connect();

    let deleteSQL: string;
    let params: any[];

    if (source) {
      deleteSQL = `DELETE FROM rag_documents WHERE tenant_id = $1 AND source = $2`;
      params = [companyId, source];
    } else {
      deleteSQL = `DELETE FROM rag_documents WHERE tenant_id = $1`;
      params = [companyId];
    }

    const result = await client.query(deleteSQL, params);
    await client.end();

    return { success: true, deleted: result.rowCount || 0 };
  } catch (error) {
    console.error("Delete documents error:", error);
    return { success: false, deleted: 0, error: (error as Error).message };
  }
}

/**
 * Refresh/re-ingest all documents for a company
 */
export async function refreshCompanyDocuments(
  options: IngestionOptions
): Promise<{ success: boolean; inserted: number; error?: string }> {
  try {
    // Delete existing documents
    const deleteResult = await deleteRagDocuments(options.companyId);
    if (!deleteResult.success) {
      throw new Error(`Failed to delete existing documents: ${deleteResult.error}`);
    }

    // Re-ingest from Supabase Storage
    return await ingestFromSupabaseStorage(options);
  } catch (error) {
    console.error("Refresh documents error:", error);
    return { success: false, inserted: 0, error: (error as Error).message };
  }
}
