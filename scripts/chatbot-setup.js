#!/usr/bin/env node

/**
 * Invista Chatbot Setup Helper
 * Run: node scripts/chatbot-setup.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function setup() {
  console.log('\n🤖 Invista Chatbot Setup Helper\n');
  console.log('This script will help you configure the chatbot system.\n');

  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    console.log('📋 .env file not found. Creating from .env.example...');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Created .env file\n');
    } else {
      console.error('❌ .env.example not found!');
      process.exit(1);
    }
  }

  console.log('📝 Please configure the following:\n');

  const companyId = await question('1. Enter your Company ID: ');
  const openaiKey = await question('2. Enter your OpenAI API Key (or press Enter to skip): ');
  const neonUrl = await question('3. Enter your Neon Database URL (or press Enter to skip): ');
  const supabaseUrl = await question('4. Enter your Supabase URL (or press Enter to skip): ');

  // Update .env file
  let envContent = fs.readFileSync(envPath, 'utf8');

  if (companyId) {
    envContent = envContent.replace(
      /RAG_DEFAULT_COMPANY_ID=".*"/,
      `RAG_DEFAULT_COMPANY_ID="${companyId}"`
    );
  }

  if (openaiKey) {
    envContent = envContent.replace(
      /OPENAI_API_KEY=".*"/,
      `OPENAI_API_KEY="${openaiKey}"`
    );
  }

  if (neonUrl) {
    envContent = envContent.replace(
      /NEON_DATABASE_URL=".*"/,
      `NEON_DATABASE_URL="${neonUrl}"`
    );
  }

  if (supabaseUrl) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_SUPABASE_URL=".*"/,
      `NEXT_PUBLIC_SUPABASE_URL="${supabaseUrl}"`
    );
  }

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Updated .env file\n');

  console.log('📚 Next steps:\n');
  console.log('1. Complete remaining .env variables manually');
  console.log('2. Run: npm run db:migrate:neon');
  console.log('3. Set up Supabase Storage bucket: "company-documents"');
  console.log('4. Upload documents to: company-documents/{companyId}/');
  console.log('5. Run ingestion: POST /api/rag/ingest-storage');
  console.log('6. Test the chatbot at /rag\n');

  console.log('📖 See CHATBOT_README.md for detailed instructions\n');

  rl.close();
}

setup().catch((error) => {
  console.error('❌ Setup error:', error);
  process.exit(1);
});
