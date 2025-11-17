import { NextRequest, NextResponse } from "next/server";
import { ingestFromSupabaseStorage, refreshCompanyDocuments } from "@/lib/rag-ingest-storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companyId = body?.companyId;
    const bucketName = body?.bucketName || "company-documents";
    const folderPath = body?.folderPath || "";
    const metadata = body?.metadata || {};
    const refresh = body?.refresh === true;

    if (!companyId) {
      return NextResponse.json(
        { error: "Missing companyId" },
        { status: 400 }
      );
    }

    const options = {
      companyId,
      bucketName,
      folderPath,
      metadata,
    };

    let result;
    if (refresh) {
      // Delete existing and re-ingest
      result = await refreshCompanyDocuments(options);
    } else {
      // Just ingest new documents
      result = await ingestFromSupabaseStorage(options);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Ingestion failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      message: `Successfully ingested ${result.inserted} document chunks`,
    });
  } catch (error) {
    console.error("Storage ingestion API error:", error);
    return NextResponse.json(
      { error: "Failed to ingest documents", details: (error as Error).message },
      { status: 500 }
    );
  }
}
