import { NextRequest, NextResponse } from "next/server";
import { ingestCompanyData } from "@/lib/rag-ingest";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const companyId = body?.companyId;

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  // Optional: Add auth check here to ensure user owns the companyId

  const result = await ingestCompanyData(companyId);

  if (result.success) {
    const stats = [];
    if (result.inserted) stats.push(`Inserted: ${result.inserted}`);
    if (result.updated) stats.push(`Updated: ${result.updated}`);
    if (result.skipped) stats.push(`Skipped: ${result.skipped}`);
    const message = stats.length > 0 ? stats.join(', ') : 'Sync completed';
    return NextResponse.json({ message, ...result });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}