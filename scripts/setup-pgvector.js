const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupPgVector() {
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, 'pgvector-setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('pgvector setup completed successfully');
  } catch (error) {
    console.error('Error setting up pgvector:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupPgVector();