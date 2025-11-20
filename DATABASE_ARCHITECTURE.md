# 🏗️ Invista Database Architecture - Complete Guide

## 📋 Overview

Invista uses a **dual-database architecture** separating authentication/user management from business operations:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER AUTHENTICATION FLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1️⃣ User logs in → Supabase Auth                                        │
│     ├─ Returns: user.id, user.email                                     │
│     └─ Creates: Session token (stored in cookies)                       │
│                                                                           │
│  2️⃣ Frontend calls: /api/companies?userId={user.id}                     │
│     ├─ Query Supabase DB: company_users table                           │
│     ├─ Joins with: companies table                                      │
│     └─ Returns: { company, userRole, isOwner }                          │
│                                                                           │
│  3️⃣ Frontend stores: companyId, companyName, userRole                   │
│     └─ Via: useCompanyData() hook → AuthContext                         │
│                                                                           │
│  4️⃣ All API calls include: companyId in request body/params             │
│     └─ Used to filter data in Neon DB                                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Structure

### 🔐 **SUPABASE DATABASE** (PostgreSQL)
**Purpose**: Authentication, User Management, Company Structure

#### Key Tables:
```typescript
companies {
  id                    // UUID - Primary identifier
  name                  // Company name (THE SOURCE OF TRUTH)
  displayName           // Optional display name
  description           // Company description
  industry              // Industry type
  website, email, phone // Contact info
  address               // JSON - Full address
  businessType          // ENUM: PRIVATE, PUBLIC, etc.
  size                  // ENUM: SMALL, MEDIUM, LARGE
  logo, primaryColor    // Branding
  createdBy             // userId who created company
  createdAt, updatedAt  // Timestamps
}

company_users {
  id                    // UUID
  companyId             // Foreign key → companies.id
  userId                // Foreign key → users.id (Supabase Auth)
  role                  // ENUM: OWNER, ADMIN, MANAGER, EMPLOYEE
  isOwner               // Boolean
  isActive              // Boolean
  title, departmentId   // Job details
}

company_locations {
  id                    // UUID
  companyId             // Foreign key → companies.id
  name                  // Location name
  type                  // ENUM: OFFICE, WAREHOUSE, STORE
  address               // JSON - Full address
  managerName           // Manager name
  isActive              // Boolean
}

users {
  id                    // UUID (Supabase Auth ID)
  email                 // User email
  // Managed by Supabase Auth
}
```

### ⚡ **NEON DATABASE** (PostgreSQL)
**Purpose**: Business Operations, Inventory, Orders

#### Key Tables:
```typescript
products {
  id                    // UUID
  companyId             // STRING - Links to Supabase companies.id
  name, description     // Product details
  sku, barcode          // Identifiers
  categoryName, brandName
  costPrice, sellingPrice
  minStockLevel, reorderPoint
  createdBy             // STRING - userId from Supabase
}

inventory_items {
  id                    // UUID
  companyId             // STRING - Links to Supabase companies.id
  productId             // Foreign key → products.id
  warehouseId           // Foreign key → warehouses.id (in Neon)
  quantity              // Stock quantity
}

orders {
  id                    // UUID
  companyId             // STRING - Links to Supabase companies.id
  orderNumber           // Order reference
  customerId            // Foreign key → customers.id
  totalAmount           // Order total
  status                // ENUM: PENDING, PROCESSING, COMPLETED
}

suppliers, customers, warehouses, purchase_orders {
  companyId             // All have companyId for multi-tenancy
}
```

## 🔗 How The Databases Connect

### Connection Point: `companyId`

```typescript
// SUPABASE DB
companies.id = "780abaa6-f0fc-4418-b3dd-6b83ed7654c8"  // UUID
companies.name = "Your Company Name"

// NEON DB  
products.companyId = "780abaa6-f0fc-4418-b3dd-6b83ed7654c8"  // STRING (UUID)
orders.companyId = "780abaa6-f0fc-4418-b3dd-6b83ed7654c8"
suppliers.companyId = "780abaa6-f0fc-4418-b3dd-6b83ed7654c8"
```

**⚠️ CRITICAL**: 
- Supabase stores the company NAME
- Neon stores the company ID but NOT the name
- To get company name, you MUST query Supabase

## 🔄 Data Flow Examples

### Example 1: User Logs In and Loads Dashboard
```typescript
// Step 1: Authentication (Supabase Auth)
const { data: { user } } = await supabase.auth.signInWithPassword({ email, password })
// Returns: { user: { id: "abc-123", email: "user@example.com" } }

// Step 2: Get Company Info (Supabase DB)
const { data } = await supabase
  .from('companies')
  .select(`
    *,
    companyUsers:company_users!inner(role, isOwner)
  `)
  .eq('companyUsers.userId', user.id)
  .single()
  
// Returns: { 
//   id: "780abaa6-f0fc-4418-b3dd-6b83ed7654c8",
//   name: "Your Company Name",  ← THIS IS WHERE THE NAME COMES FROM
//   industry: "Retail",
//   companyUsers: [{ role: "ADMIN", isOwner: true }]
// }

// Step 3: Store in Frontend State
const companyId = data.id          // "780abaa6-f0fc-4418-b3dd-6b83ed7654c8"
const companyName = data.name      // "Your Company Name"

// Step 4: Query Business Data (Neon DB)
const products = await neonClient.product.findMany({
  where: { companyId: companyId }  // Filter by company
})
```

### Example 2: RAG System Needs Company Name
```typescript
// ❌ WRONG - Querying Neon DB for company name
const product = await neonClient.product.findFirst({
  where: { companyId }
})
// product.companyId exists BUT product has NO company name field!

// ✅ CORRECT - Query Supabase for company info
const { Client } = require('pg')
const supabaseClient = new Client({ 
  connectionString: process.env.SUPABASE_DATABASE_URL 
})
await supabaseClient.connect()

const result = await supabaseClient.query(`
  SELECT name, displayName, industry, website
  FROM companies 
  WHERE id = $1
`, [companyId])

const companyName = result.rows[0].name  // "Your Company Name"

// Then use this name in RAG documents
const document = {
  content: `Company: ${companyName} | Product: ${product.name}`
}
```

## 🛠️ Code Implementation

### Getting Company Data in API Routes

```typescript
// app/api/rag/ingest/route.ts
export async function POST(req: NextRequest) {
  const { companyId } = await req.json()
  
  // 1. Connect to Supabase PostgreSQL (NOT Prisma!)
  const supabaseClient = new Client({ 
    connectionString: process.env.SUPABASE_DATABASE_URL 
  })
  await supabaseClient.connect()
  
  // 2. Query company profile with correct column names
  const profileQuery = `
    SELECT name, "displayName", description, industry, 
           website, address, email, phone, size, "businessType"
    FROM companies 
    WHERE id = $1
  `
  const profileRes = await supabaseClient.query(profileQuery, [companyId])
  const profile = profileRes.rows[0]
  
  const companyName = profile.name  // ← Company name from Supabase
  
  await supabaseClient.end()
  
  // 3. Now query business data from Neon
  const neonClient = new Client({ 
    connectionString: process.env.NEON_DATABASE_URL 
  })
  await neonClient.connect()
  
  const productsQuery = `
    SELECT name, sku, description
    FROM products
    WHERE "companyId" = $1
  `
  const productsRes = await neonClient.query(productsQuery, [companyId])
  const products = productsRes.rows
  
  await neonClient.end()
  
  // 4. Create RAG document with company name
  const document = {
    content: `
      Company Name: ${companyName}
      Company: ${companyName}
      
      Products for ${companyName}:
      ${products.map(p => `- ${p.name} (${p.sku})`).join('\n')}
    `
  }
  
  return NextResponse.json({ success: true })
}
```

### Using Prisma Clients

```typescript
// lib/db.ts
import { PrismaClient as NeonClient } from '@/prisma/generated/neon'
import { PrismaClient as SupabaseClient } from '@/prisma/generated/supabase'

export const neonClient = new NeonClient({
  datasources: { neonDb: { url: process.env.NEON_DATABASE_URL } }
})

export const supabaseClient = new SupabaseClient({
  datasources: { supabaseDb: { url: process.env.SUPABASE_DATABASE_URL } },
  log: ['error']  // Suppress warnings
})

// Usage:
// For company name:
const company = await supabaseClient.company.findUnique({
  where: { id: companyId }
})

// For business data:
const products = await neonClient.product.findMany({
  where: { companyId: companyId }
})
```

## ⚠️ Common Mistakes

### ❌ MISTAKE 1: Trying to get company name from Neon DB
```typescript
// This will FAIL - company name doesn't exist in Neon
const product = await neonClient.product.findFirst({
  where: { companyId },
  include: { company: true }  // ← No relation defined!
})
```

### ❌ MISTAKE 2: Using wrong column names
```typescript
// Supabase uses camelCase, not snake_case
const query = `SELECT business_type FROM companies`  // ❌ Error
const query = `SELECT "businessType" FROM companies` // ✅ Correct
```

### ❌ MISTAKE 3: Forgetting to quote camelCase columns
```typescript
const query = `SELECT businessType FROM companies`   // ❌ Error
const query = `SELECT "businessType" FROM companies` // ✅ Correct
```

## ✅ Best Practices

### 1. **Always Get Company Info From Supabase**
```typescript
// Do this once at the start of your operation
const companyInfo = await getCompanyFromSupabase(companyId)
const companyName = companyInfo.name
```

### 2. **Use Direct PostgreSQL Connections for Cross-DB Queries**
```typescript
import { Client } from 'pg'

// More reliable than Prisma for raw SQL
const client = new Client({ connectionString: DB_URL })
await client.connect()
const result = await client.query('SELECT * FROM table WHERE id = $1', [id])
await client.end()
```

### 3. **Cache Company Data**
```typescript
// Company info changes rarely - cache it
const companyCache = new Map()

async function getCompanyName(companyId: string) {
  if (companyCache.has(companyId)) {
    return companyCache.get(companyId)
  }
  
  const company = await fetchFromSupabase(companyId)
  companyCache.set(companyId, company.name)
  return company.name
}
```

### 4. **Include Company Context in All Documents**
```typescript
// RAG documents should always have company context
const document = {
  content: `
    Company: ${companyName}
    Industry: ${industry}
    
    [Your actual content here]
  `,
  metadata: {
    companyId,
    companyName,
    source: 'company-profile'
  }
}
```

## 🔧 Environment Variables Required

```env
# Supabase (Auth + Company Data)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Neon (Business Data)
NEON_DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]

# OpenAI (RAG)
OPENAI_API_KEY=sk-xxx
```

## 📊 Query Examples

### Get Company with Locations
```typescript
const { data } = await supabase
  .from('companies')
  .select(`
    *,
    locations:company_locations(*)
  `)
  .eq('id', companyId)
  .single()
```

### Get All Products for Company
```typescript
const products = await neonClient.product.findMany({
  where: { companyId },
  include: {
    inventoryItems: true,
    suppliers: true
  }
})
```

### Get User's Company
```typescript
const { data } = await supabase
  .from('company_users')
  .select(`
    company:companies(*),
    role,
    isOwner
  `)
  .eq('userId', userId)
  .eq('isActive', true)
  .single()
```

## 🎯 Summary

**The Golden Rule**: 
> **Company NAME lives in Supabase. Company ID is used everywhere else.**

**When you need company information:**
1. Get `companyId` from user session/context
2. Query Supabase `companies` table for company details (name, industry, etc.)
3. Use `companyId` to filter business data in Neon DB
4. Combine the data as needed

**For RAG system specifically:**
1. User provides `companyId` in request
2. Query Supabase for company name and profile
3. Query Neon for products, orders, inventory using `companyId`
4. Create documents that include: `Company: ${companyName}` prefix
5. Store in RAG vector database with `tenant_id = companyId`
