#!/usr/bin/env node

/**
 * Invista Chatbot Test Script
 * Tests the chatbot API endpoints
 * Run: node scripts/test-chatbot.js
 */

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const companyId = process.env.RAG_DEFAULT_COMPANY_ID || 'test-company';

async function testIntentClassifier() {
  console.log('\n🔍 Testing Intent Classifier...\n');

  const testCases = [
    { message: 'How do I create a purchase order?', expected: 'knowledge.explainer' },
    { message: 'Show me low stock items', expected: 'inventory.lowstock' },
    { message: "What's the status of order #123?", expected: 'orders.status' },
    { message: 'Go to dashboard', expected: 'navigation.page' },
    { message: 'Hello', expected: 'fallback' },
  ];

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${baseUrl}/api/chat/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCase.message }),
      });

      const data = await response.json();
      const match = data.intent === testCase.expected ? '✅' : '❌';
      
      console.log(`${match} "${testCase.message}"`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Got: ${data.intent} (confidence: ${data.confidence})\n`);
    } catch (error) {
      console.error(`❌ Error testing: "${testCase.message}"`, error.message);
    }
  }
}

async function testNavigationMap() {
  console.log('\n🧭 Testing Navigation Map...\n');

  const { findNavigationIntent } = await import('../lib/navigation-map.ts');

  const testCases = ['inventory', 'dashboard', 'orders', 'reports', 'nonexistent'];

  for (const testCase of testCases) {
    const result = findNavigationIntent(testCase);
    if (result) {
      console.log(`✅ "${testCase}" → ${result.url}`);
    } else {
      console.log(`❌ "${testCase}" → Not found`);
    }
  }
}

async function testChatEndpoint() {
  console.log('\n💬 Testing Chat Endpoint...\n');

  const testMessages = [
    'Hello!',
    'How do I create an order?',
    'Show me inventory',
  ];

  for (const message of testMessages) {
    try {
      console.log(`Testing: "${message}"`);
      
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, companyId }),
      });

      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream')) {
        console.log('✅ Streaming response received\n');
      } else {
        const data = await response.json();
        console.log(`✅ Response: ${data.answer?.substring(0, 100)}...\n`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
}

async function testRAGIngestion() {
  console.log('\n📚 Testing RAG Ingestion Status...\n');

  try {
    // Just check if the endpoint exists
    const response = await fetch(`${baseUrl}/api/rag/ingest-storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });

    if (response.status === 200 || response.status === 400 || response.status === 500) {
      console.log('✅ Ingestion endpoint is accessible');
      console.log('   (Actual ingestion requires Supabase Storage setup)\n');
    }
  } catch (error) {
    console.error('❌ Ingestion endpoint error:', error.message, '\n');
  }
}

async function runTests() {
  console.log('🧪 Invista Chatbot System Tests');
  console.log('================================\n');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Company ID: ${companyId}\n`);

  try {
    await testIntentClassifier();
    await testNavigationMap();
    await testChatEndpoint();
    await testRAGIngestion();

    console.log('\n✅ All tests complete!\n');
    console.log('📖 See CHATBOT_README.md for usage instructions\n');
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Check if server is running
fetch(baseUrl)
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.error(`❌ Server not running at ${baseUrl}`);
    console.log('Start the dev server with: npm run dev\n');
    process.exit(1);
  });
