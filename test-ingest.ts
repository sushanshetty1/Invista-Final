import { supabase } from './lib/supabaseClient';
import { ingestCompanyData } from './lib/rag-ingest';

async function testIngestion() {
  try {
    // Get a companyId from Supabase
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error fetching company:', error);
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('No companies found');
      return;
    }

    const companyId = companies[0].id;
    console.log('Using companyId:', companyId);

    await ingestCompanyData(companyId);
    console.log('Ingestion successful');
  } catch (error) {
    console.error('Ingestion failed:', error);
  }
}

testIngestion();