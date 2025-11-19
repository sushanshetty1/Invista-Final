import { supabase } from './lib/supabaseClient';

async function getCompanyId() {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Company ID:', data[0].id);
  } else {
    console.log('No companies found');
  }
}

getCompanyId();