import { Client } from "pg";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHUNK_MAX_CHARS = Number(process.env.RAG_CHUNK_MAX_CHARS ?? "1500");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function chunkText(text: string, maxChars = CHUNK_MAX_CHARS) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";
  for (const p of paragraphs) {
    if ((buffer + "\n\n" + p).length > maxChars) {
      if (buffer) chunks.push(buffer.trim());
      buffer = p;
    } else {
      buffer = buffer ? buffer + "\n\n" + p : p;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks;
}

async function embedText(text: string) {
  const resp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return resp.data[0].embedding as number[];
}

async function getCompanyData(companyId: string) {
  const neonClient = new Client({ connectionString: NEON_DATABASE_URL });
  const supabaseClient = new Client({ connectionString: process.env.SUPABASE_DATABASE_URL! });
  
  try {
    console.log(`[RAG Ingest] Starting data fetch for company: ${companyId}`);
    
    // Connect to Supabase PostgreSQL directly
    await supabaseClient.connect();
    console.log('[RAG Ingest] Connected to Supabase database');

    // Query company profile directly from Supabase PostgreSQL
    const profileQuery = `
      SELECT name, "displayName", description, industry, website, address, email, phone, size, "businessType"
      FROM companies 
      WHERE id = $1
    `;
    const profileRes = await supabaseClient.query(profileQuery, [companyId]);
    const profile = profileRes.rows[0];

    if (!profile) {
      throw new Error(`Company not found with ID: ${companyId}`);
    }

    console.log(`[RAG Ingest] Found company: ${profile.name}`);

    // Query company locations/warehouses from Supabase
    const locationsQuery = `
      SELECT name, type, address, "managerName", "isActive"
      FROM company_locations
      WHERE "companyId" = $1 AND "isActive" = true
    `;
    const locationsRes = await supabaseClient.query(locationsQuery, [companyId]);
    const locations = locationsRes.rows;

    console.log(`[RAG Ingest] Found ${locations.length} active locations`);

    await supabaseClient.end();

    // Connect to Neon for business data
    await neonClient.connect();
    console.log('[RAG Ingest] Connected to Neon database');

    // Query products from Neon
    const productsQuery = `
      SELECT 
        id, name, sku, description, "categoryName", "brandName", 
        "sellingPrice", "costPrice", status, "minStockLevel", "reorderPoint"
      FROM products 
      WHERE "companyId" = $1 AND status = 'ACTIVE'
      ORDER BY "createdAt" DESC
      LIMIT 50
    `;
    const productsRes = await neonClient.query(productsQuery, [companyId]);
    const products = productsRes.rows;
    console.log(`[RAG Ingest] Found ${products.length} products`);

    // Query inventory summary from Neon
    const inventoryQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT ii.id) as total_inventory_items,
        COALESCE(SUM(ii.quantity), 0) as total_stock,
        COALESCE(SUM(ii."availableQuantity"), 0) as available_stock,
        COALESCE(SUM(ii."reservedQuantity"), 0) as reserved_stock
      FROM products p
      LEFT JOIN inventory_items ii ON p.id = ii."productId"
      WHERE p."companyId" = $1
    `;
    const inventoryRes = await neonClient.query(inventoryQuery, [companyId]);
    const inventorySummary = inventoryRes.rows[0];
    console.log(`[RAG Ingest] Inventory: ${inventorySummary.total_products} products, ${inventorySummary.total_stock} total stock`);

    // Query top inventory items from Neon
    const topInventoryQuery = `
      SELECT 
        p.name, p.sku, 
        COALESCE(SUM(ii.quantity), 0) as total_quantity,
        COALESCE(SUM(ii."availableQuantity"), 0) as available_quantity,
        p."sellingPrice"
      FROM products p
      LEFT JOIN inventory_items ii ON p.id = ii."productId"
      WHERE p."companyId" = $1
      GROUP BY p.id, p.name, p.sku, p."sellingPrice"
      ORDER BY total_quantity DESC
      LIMIT 20
    `;
    const topInventoryRes = await neonClient.query(topInventoryQuery, [companyId]);
    const topInventory = topInventoryRes.rows;

    // Query low stock items
    const lowStockQuery = `
      SELECT 
        p.name, p.sku, 
        COALESCE(SUM(ii.quantity), 0) as current_stock,
        p."minStockLevel", p."reorderPoint"
      FROM products p
      LEFT JOIN inventory_items ii ON p.id = ii."productId"
      WHERE p."companyId" = $1
      GROUP BY p.id, p.name, p.sku, p."minStockLevel", p."reorderPoint"
      HAVING COALESCE(SUM(ii.quantity), 0) < p."minStockLevel"
      ORDER BY current_stock ASC
      LIMIT 20
    `;
    const lowStockRes = await neonClient.query(lowStockQuery, [companyId]);
    const lowStockItems = lowStockRes.rows;
    console.log(`[RAG Ingest] Found ${lowStockItems.length} low stock items`);

    // Query suppliers from Neon
    const suppliersQuery = `
      SELECT 
        id, name, code, email, phone, website, status, 
        "contactName", "paymentTerms", rating, "onTimeDelivery"
      FROM suppliers 
      WHERE "companyId" = $1 AND status = 'ACTIVE'
      ORDER BY name
      LIMIT 30
    `;
    const suppliersRes = await neonClient.query(suppliersQuery, [companyId]);
    const suppliers = suppliersRes.rows;
    console.log(`[RAG Ingest] Found ${suppliers.length} suppliers`);

    // Query customers from Neon
    const customersQuery = `
      SELECT 
        id, "customerNumber", type, "firstName", "lastName", "companyName",
        email, phone, status, "creditLimit", "paymentTerms"
      FROM customers 
      WHERE "companyId" = $1 AND status = 'ACTIVE'
      ORDER BY "createdAt" DESC
      LIMIT 30
    `;
    const customersRes = await neonClient.query(customersQuery, [companyId]);
    const customers = customersRes.rows;
    console.log(`[RAG Ingest] Found ${customers.length} customers`);

    // Query orders summary from Neon
    const ordersQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM("totalAmount"), 0) as total_revenue,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'PROCESSING' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM orders 
      WHERE "companyId" = $1
    `;
    const ordersRes = await neonClient.query(ordersQuery, [companyId]);
    const ordersSummary = ordersRes.rows[0];
    console.log(`[RAG Ingest] Orders: ${ordersSummary.total_orders} total, $${ordersSummary.total_revenue} revenue`);

    // Query recent orders from Neon
    const recentOrdersQuery = `
      SELECT 
        "orderNumber", status, "fulfillmentStatus", "paymentStatus",
        "totalAmount", "orderDate", "requiredDate"
      FROM orders 
      WHERE "companyId" = $1
      ORDER BY "orderDate" DESC
      LIMIT 20
    `;
    const recentOrdersRes = await neonClient.query(recentOrdersQuery, [companyId]);
    const recentOrders = recentOrdersRes.rows;

    await neonClient.end();
    console.log('[RAG Ingest] Data collection completed successfully');

    // Build comprehensive data documents
    const documents: { source: string; content: string }[] = [];

    const companyName = profile?.name || 'Unknown Company';
    const companyInfo = `Company: ${companyName} | Industry: ${profile?.industry || 'N/A'}`;

    // 1. Company Identity & Overview Document (Primary reference)
    documents.push({
      source: "company-identity",
      content: `
Company Identity & Overview:
==================================
Company Name: ${companyName}
Full Legal Name: ${companyName}
Business Name: ${companyName}

Company Profile Details:
- Name: ${companyName}
- Display Name: ${profile?.displayName || companyName}
- Description: ${profile?.description || 'N/A'}
- Industry: ${profile?.industry || 'N/A'}
- Website: ${profile?.website || 'N/A'}
- Email: ${profile?.email || 'N/A'}
- Phone: ${profile?.phone || 'N/A'}
- Address: ${JSON.stringify(profile?.address) || 'N/A'}
- Company Size: ${profile?.size || 'N/A'}
- Business Type: ${profile?.businessType || 'N/A'}

This is ${companyName}, operating in the ${profile?.industry || 'N/A'} industry.
      `.trim()
    });

    // 2. Locations/Warehouses Document
    if (locations && locations.length > 0) {
      documents.push({
        source: "warehouses-locations",
        content: `
${companyInfo}

Company Locations and Warehouses for ${companyName}:
Total Active Locations: ${locations.length}

${locations.map((loc: any) => `
- Location: ${loc.name}
  Type: ${loc.type || 'N/A'}
  Address: ${JSON.stringify(loc.address) || 'N/A'}
  Manager: ${loc.managerName || 'N/A'}
  Status: ${loc.isActive ? 'Active' : 'Inactive'}
`).join('\n')}
        `.trim()
      });
    }

    // 3. Products Document
    if (products && products.length > 0) {
      documents.push({
        source: "products-catalog",
        content: `
${companyInfo}

Products Catalog for ${companyName}:
Total Active Products: ${products.length}

${products.slice(0, 30).map((prod: any) => `
- Product: ${prod.name} (SKU: ${prod.sku})
  Category: ${prod.categoryName || 'N/A'}
  Brand: ${prod.brandName || 'N/A'}
  Selling Price: $${prod.sellingPrice || 0}
  Cost Price: $${prod.costPrice || 0}
  Min Stock Level: ${prod.minStockLevel || 0}
  Reorder Point: ${prod.reorderPoint || 0}
  Status: ${prod.status}
  ${prod.description ? `Description: ${prod.description}` : ''}
`).join('\n')}
        `.trim()
      });
    }

    // 4. Inventory Summary Document
    documents.push({
      source: "inventory-summary",
      content: `
${companyInfo}

Inventory Summary for ${companyName}:
Total Products: ${inventorySummary.total_products || 0}
Total Inventory Items: ${inventorySummary.total_inventory_items || 0}
Total Stock Quantity: ${inventorySummary.total_stock || 0}
Available Stock: ${inventorySummary.available_stock || 0}
Reserved Stock: ${inventorySummary.reserved_stock || 0}

Top Inventory Items by Stock:
${topInventory.map((item: any) => `- ${item.name} (${item.sku}): ${item.total_quantity} units (${item.available_quantity} available) @ $${item.sellingPrice || 0}`).join('\n')}

${lowStockItems.length > 0 ? `Low Stock Alerts (${lowStockItems.length} items):
${lowStockItems.map((item: any) => `- ${item.name} (${item.sku}): ${item.current_stock} units (Min: ${item.minStockLevel}, Reorder: ${item.reorderPoint})`).join('\n')}` : ''}
      `.trim()
    });

    // 5. Suppliers Document
    if (suppliers && suppliers.length > 0) {
      documents.push({
        source: "suppliers",
        content: `
${companyInfo}

Suppliers Directory for ${companyName}:
Total Active Suppliers: ${suppliers.length}

${suppliers.map((sup: any) => `
- Supplier: ${sup.name} (Code: ${sup.code})
  Contact: ${sup.contactName || 'N/A'}
  Email: ${sup.email || 'N/A'}
  Phone: ${sup.phone || 'N/A'}
  Website: ${sup.website || 'N/A'}
  Payment Terms: ${sup.paymentTerms || 'N/A'}
  Rating: ${sup.rating || 'N/A'}/5
  On-Time Delivery: ${sup.onTimeDelivery ? (sup.onTimeDelivery * 100).toFixed(1) + '%' : 'N/A'}
  Status: ${sup.status}
`).join('\n')}
        `.trim()
      });
    }

    // 6. Customers Document
    if (customers && customers.length > 0) {
      documents.push({
        source: "customers",
        content: `
${companyInfo}

Customers Directory for ${companyName}:
Total Active Customers: ${customers.length}

${customers.map((cust: any) => `
- Customer #${cust.customerNumber}
  Name: ${cust.type === 'COMPANY' ? cust.companyName : `${cust.firstName || ''} ${cust.lastName || ''}`.trim()}
  Type: ${cust.type}
  Email: ${cust.email || 'N/A'}
  Phone: ${cust.phone || 'N/A'}
  Credit Limit: $${cust.creditLimit || 0}
  Payment Terms: ${cust.paymentTerms || 'N/A'}
  Status: ${cust.status}
`).join('\n')}
        `.trim()
      });
    }

    // 7. Orders Analytics Document
    documents.push({
      source: "orders-analytics",
      content: `
${companyInfo}

Orders Analytics for ${companyName}:
Total Orders: ${ordersSummary.total_orders || 0}
Total Revenue: $${Number(ordersSummary.total_revenue || 0).toLocaleString()}
Pending Orders: ${ordersSummary.pending_orders || 0}
Processing Orders: ${ordersSummary.processing_orders || 0}
Completed Orders: ${ordersSummary.completed_orders || 0}
Cancelled Orders: ${ordersSummary.cancelled_orders || 0}

Recent Orders:
${recentOrders.map((order: any) => `- Order ${order.orderNumber}: $${order.totalAmount} - ${order.status} (Fulfillment: ${order.fulfillmentStatus}, Payment: ${order.paymentStatus}) - Date: ${new Date(order.orderDate).toLocaleDateString()}`).join('\n')}
      `.trim()
    });

    return documents;
  } catch (error) {
    console.error("Error fetching company data:", error);
    throw error;
  }
}

export async function ingestCompanyData(companyId: string) {
  const ragClient = new Client({ connectionString: NEON_DATABASE_URL });
  
  try {
    console.log(`[RAG Ingest] Starting ingestion for company: ${companyId}`);
    const documents = await getCompanyData(companyId);
    
    console.log(`[RAG Ingest] Generated ${documents.length} documents`);
    documents.forEach(doc => {
      console.log(`  - ${doc.source}: ${doc.content.length} characters`);
    });
    
    await ragClient.connect();

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    // Process each document separately
    for (const doc of documents) {
      const chunks = chunkText(doc.content, CHUNK_MAX_CHARS);
      console.log(`[RAG Ingest] Processing ${doc.source}: ${chunks.length} chunks`);
      
      for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i];
        
        // Check if this exact chunk already exists
        const existingCheck = await ragClient.query(
          `SELECT id, content FROM rag_documents WHERE tenant_id = $1 AND source = $2 AND chunk_index = $3`,
          [companyId, doc.source, i]
        );
        
        if (existingCheck.rows.length > 0) {
          const existing = existingCheck.rows[0];
          
          // Only update if content has changed
          if (existing.content === content) {
            totalSkipped++;
            continue;
          }
          
          // Update existing document
          const embedding = await embedText(content);
          if (!embedding || embedding.length === 0) continue;
          
          const embeddingLiteral = "[" + embedding.join(",") + "]";
          await ragClient.query(
            `UPDATE rag_documents SET content = $1, embedding = $2::vector, updated_at = NOW() WHERE id = $3`,
            [content, embeddingLiteral, existing.id]
          );
          totalUpdated++;
        } else {
          // Insert new document
          const embedding = await embedText(content);
          if (!embedding || embedding.length === 0) continue;

          const embeddingLiteral = "[" + embedding.join(",") + "]";
          await ragClient.query(
            `INSERT INTO rag_documents (source, chunk_index, content, embedding, tenant_id) VALUES ($1, $2, $3, $4::vector, $5)`,
            [doc.source, i, content, embeddingLiteral, companyId]
          );
          totalInserted++;
        }
      }
      
      // Delete any extra chunks that no longer exist for this source
      const currentChunkCount = chunks.length;
      await ragClient.query(
        `DELETE FROM rag_documents WHERE tenant_id = $1 AND source = $2 AND chunk_index >= $3`,
        [companyId, doc.source, currentChunkCount]
      );
    }
    
    // Delete any sources that are no longer in the documents array
    const currentSources = documents.map(d => d.source);
    if (currentSources.length > 0) {
      await ragClient.query(
        `DELETE FROM rag_documents WHERE tenant_id = $1 AND source NOT IN (${currentSources.map((_, i) => `$${i + 2}`).join(',')})`,
        [companyId, ...currentSources]
      );
    }

    await ragClient.end();
    console.log(`[RAG Ingest] Sync complete - Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);
    return { success: true, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped };
  } catch (error) {
    console.error("[RAG Ingest] Ingestion error:", error);
    try {
      await ragClient.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return { success: false, error: (error as Error).message };
  }
}