import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL as string;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  const client = new Client({ connectionString: NEON_DATABASE_URL });

  try {
    await client.connect();

    // Check if any RAG documents exist for this company
    const result = await client.query(
      "SELECT COUNT(*) as count FROM rag_documents WHERE tenant_id = $1",
      [companyId]
    );

    const count = parseInt(result.rows[0]?.count || "0");
    const hasData = count > 0;

    return NextResponse.json({ hasData, count });
  } catch (error: any) {
    console.error("[RAG Check] Error:", error);
    return NextResponse.json({ hasData: false, count: 0 });
  } finally {
    await client.end();
  }
}
