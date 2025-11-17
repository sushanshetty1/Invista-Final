import { ingestCompanyData } from '../lib/rag-ingest';

async function main() {
  const companyId = process.argv[2];
  if (!companyId) {
    console.error('Usage: npx tsx scripts/rag-ingest.ts <companyId>');
    process.exit(1);
  }

  console.log(`Starting ingestion for company ${companyId}...`);
  const result = await ingestCompanyData(companyId);

  if (result.success) {
    console.log(`Successfully ingested ${result.inserted} chunks for company ${companyId}`);
  } else {
    console.error(`Ingestion failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch(console.error);
