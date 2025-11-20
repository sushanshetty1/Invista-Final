import { Client } from "pg";
import OpenAI from "openai";
import dotenv from "dotenv";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

dotenv.config();

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHUNK_MAX_CHARS = Number(process.env.RAG_CHUNK_MAX_CHARS ?? "1500");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const client = new Client({ connectionString: NEON_DATABASE_URL });
  
  try {
    // Query company profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('companies')
      .select('name, description, industry, website, address, email, phone, size, business_type, founded_year, annual_revenue')
      .eq('id', companyId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch company profile: ${profileError.message}`);
    }

    // Query company locations/warehouses from Supabase
    const { data: locations, error: locationsError } = await supabase
      .from('company_locations')
      .select('name, type, address, managerName, managerEmail, isActive')
      .eq('companyId', companyId)
      .eq('isActive', true);

    await client.connect();

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
    const productsRes = await client.query(productsQuery, [companyId]);
    const products = productsRes.rows;

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
    const inventoryRes = await client.query(inventoryQuery, [companyId]);
    const inventorySummary = inventoryRes.rows[0];

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
    const topInventoryRes = await client.query(topInventoryQuery, [companyId]);
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
    const lowStockRes = await client.query(lowStockQuery, [companyId]);
    const lowStockItems = lowStockRes.rows;

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
    const suppliersRes = await client.query(suppliersQuery, [companyId]);
    const suppliers = suppliersRes.rows;

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
    const customersRes = await client.query(customersQuery, [companyId]);
    const customers = customersRes.rows;

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
    const ordersRes = await client.query(ordersQuery, [companyId]);
    const ordersSummary = ordersRes.rows[0];

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
    const recentOrdersRes = await client.query(recentOrdersQuery, [companyId]);
    const recentOrders = recentOrdersRes.rows;

    // Query purchase orders from Neon
    const purchaseOrdersQuery = `
      SELECT 
        COUNT(*) as total_purchase_orders,
        COALESCE(SUM("totalAmount"), 0) as total_po_amount,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_pos,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_pos
      FROM purchase_orders 
      WHERE "companyId" = $1
    `;
    const purchaseOrdersRes = await client.query(purchaseOrdersQuery, [companyId]);
    const purchaseOrdersSummary = purchaseOrdersRes.rows[0];

    await client.end();

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
- Description: ${profile?.description || 'N/A'}
- Industry: ${profile?.industry || 'N/A'}
- Website: ${profile?.website || 'N/A'}
- Email: ${profile?.email || 'N/A'}
- Phone: ${profile?.phone || 'N/A'}
- Address: ${JSON.stringify(profile?.address) || 'N/A'}
- Company Size: ${profile?.size || 'N/A'}
- Business Type: ${profile?.business_type || 'N/A'}
- Founded Year: ${profile?.founded_year || 'N/A'}
- Annual Revenue: ${profile?.annual_revenue || 'N/A'}

This is ${companyName}, operating in the ${profile?.industry || 'N/A'} industry.
      `.trim()
    });

    // 2. Locations/Warehouses Document
    if (locations && locations.length > 0) {
      documents.push({
        source: "warehouses-locations",
        content: `
Company Locations and Warehouses:
Total Active Locations: ${locations.length}

${locations.map((loc: any) => `
- Location: ${loc.name}
  Type: ${loc.type || 'N/A'}
  Address: ${JSON.stringify(loc.address) || 'N/A'}
  Manager: ${loc.managerName || 'N/A'} (${loc.managerEmail || 'N/A'})
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
Products Catalog:
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
Inventory Summary:
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
Suppliers Directory:
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
Customers Directory:
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
Orders Analytics:
Total Orders: ${ordersSummary.total_orders || 0}
Total Revenue: $${Number(ordersSummary.total_revenue || 0).toLocaleString()}
Pending Orders: ${ordersSummary.pending_orders || 0}
Processing Orders: ${ordersSummary.processing_orders || 0}
Completed Orders: ${ordersSummary.completed_orders || 0}
Cancelled Orders: ${ordersSummary.cancelled_orders || 0}

Recent Orders:
${recentOrders.map((order: any) => `- Order ${order.orderNumber}: $${order.totalAmount} - ${order.status} (Fulfillment: ${order.fulfillmentStatus}, Payment: ${order.paymentStatus}) - Date: ${new Date(order.orderDate).toLocaleDateString()}`).join('\n')}

Purchase Orders Summary:
Total Purchase Orders: ${purchaseOrdersSummary.total_purchase_orders || 0}
Total PO Amount: $${Number(purchaseOrdersSummary.total_po_amount || 0).toLocaleString()}
Pending POs: ${purchaseOrdersSummary.pending_pos || 0}
Approved POs: ${purchaseOrdersSummary.approved_pos || 0}
      `.trim()
    });

    return documents;
  } catch (error) {
    console.error("Error fetching company data:", error);
    throw error;
  }
}

export async function ingestCompanyData(companyId: string) {
  const client = new Client({ connectionString: NEON_DATABASE_URL });
  
  try {
    const documents = await getCompanyData(companyId);
    await client.connect();

    // Delete existing data for the company
    await client.query(`DELETE FROM rag_documents WHERE tenant_id = $1`, [companyId]);

    let totalInserted = 0;
    
    // Process each document separately
    for (const doc of documents) {
      const chunks = chunkText(doc.content, CHUNK_MAX_CHARS);
      
      for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i];
        const embedding = await embedText(content);
        if (!embedding || embedding.length === 0) continue;

        const embeddingLiteral = "[" + embedding.join(",") + "]";
        const insertSQL = `INSERT INTO rag_documents (source, chunk_index, content, embedding, tenant_id) VALUES ($1, $2, $3, $4::vector, $5)`;
        await client.query(insertSQL, [doc.source, i, content, embeddingLiteral, companyId]);
        totalInserted++;
      }
    }

    await client.end();
    return { success: true, inserted: totalInserted };
  } catch (error) {
    console.error("Ingestion error:", error);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return { success: false, error: (error as Error).message };
  }
}