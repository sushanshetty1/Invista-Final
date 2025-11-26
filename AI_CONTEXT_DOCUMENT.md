# 🤖 AI CONTEXT DOCUMENT - INVISTA DATABASE REBUILD

> **Purpose:** This document provides complete context for any AI assistant (Claude, GPT, etc.) to understand the project state and continue work seamlessly.
> 
> **Last Updated:** November 26, 2025
> **Updated By:** Claude Opus 4.5 (GitHub Copilot)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [What We Had To Do (Original Problem)](#what-we-had-to-do)
3. [What We Did (Completed Work)](#what-we-did)
4. [What Remains To Do](#what-remains-to-do)
5. [Technical Architecture](#technical-architecture)
6. [Schema Field Differences (CRITICAL)](#schema-field-differences)
7. [File-by-File Status](#file-by-file-status)
8. [Common Patterns & Solutions](#common-patterns-and-solutions)
9. [How To Continue](#how-to-continue)

---

## 🎯 PROJECT OVERVIEW

**Invista** is an inventory management system being rebuilt with a **dual-database architecture**:

| Database | Purpose | Tables |
|----------|---------|--------|
| **Supabase** | Authentication, Users, Companies, Sessions | 13 tables |
| **Neon** | Business Logic - Products, Inventory, Orders, Suppliers | 23 tables |

**Total: 36 tables**

**Why dual databases?**
- Supabase handles auth with built-in security features
- Neon handles business data with pgvector for AI/RAG features
- Clean separation of concerns

---

## ❌ WHAT WE HAD TO DO

### The Original Problem

The codebase had **OLD schema field names** that no longer exist in the NEW database schemas. This caused **184+ TypeScript errors** across the application.

### Root Cause

The previous schema had fields like:
- `availableQuantity` on InventoryItem (now computed)
- `companyName` on Customer (now `businessName`)
- `location` on InventoryItem (now `zone/aisle/shelf/bin`)
- `categoryName/brandName` on Product (now use relations)
- And many more...

### Goal

Fix all TypeScript errors by updating code to use NEW schema field names and proper Prisma relations.

---

## ✅ WHAT WE DID

### Phase 1: Database Setup ✅ COMPLETE

```bash
# Generated Prisma clients for both databases
npx prisma generate --schema=prisma/schema-neon.prisma
npx prisma generate --schema=prisma/schema-supabase.prisma

# Pushed schemas to databases
npx prisma db push --schema=prisma/schema-neon.prisma
npx prisma db push --schema=prisma/schema-supabase.prisma
```

**Result:** Both databases have all tables created with correct schema.

### Phase 2: Prisma Client Setup ✅ COMPLETE

Fixed all files in `lib/prisma/`:

| File | Status | Purpose |
|------|--------|---------|
| `lib/prisma/index.ts` | ✅ Fixed | Exports both clients |
| `lib/prisma/neon.ts` | ✅ Fixed | Neon client singleton |
| `lib/prisma/supabase.ts` | ✅ Fixed | Supabase client singleton |
| `lib/prisma/sync.ts` | ✅ Fixed | Cross-database sync utilities |

**Database Tables (36 total):**
- **Supabase (13 tables):** User, Company, CompanyMember, UserSession, LoginHistory, AuditLog, CompanyInvite, CompanyLocation, CompanyIntegration, UserInvitation, UserPreference, UserNotification, BillingHistory
- **Neon (23 tables):** Category, Brand, Tag, Warehouse, Supplier, Customer, Product, ProductVariant, VariantAttribute, ProductImage, ProductTag, InventoryItem, InventoryMovement, StockReservation, InventoryAudit, InventoryAuditItem, ProductSupplier, PurchaseOrder, PurchaseOrderItem, Order, OrderItem, ProductReview, RagDocument

**How to import:**
```typescript
// For Neon (business data)
import { neonClient } from "@/lib/prisma";

// For Supabase (auth/users)
import { supabaseClient } from "@/lib/prisma";
```

### Phase 3: API Routes ✅ COMPLETE (27+ files)

**ALL API routes in `app/api/` are now fixed and have ZERO TypeScript errors.**

Fixed routes include:

#### Audits API (`app/api/audits/`)
- ✅ `route.ts` - Main audits CRUD
- ✅ `[id]/route.ts` - Single audit
- ✅ `[id]/items/route.ts` - Audit items
- ✅ `stats/route.ts` - Audit statistics
- ✅ `compliance/route.ts` - Compliance reports
- ✅ `compliance/trends/route.ts` - Compliance trends
- ✅ `cycle-counting/route.ts` - Cycle counting
- ✅ `cycle-counting/schedule/route.ts` - Schedule
- ✅ `cycle-counting/stats/route.ts` - Counting stats
- ✅ `discrepancies/route.ts` - Discrepancies
- ✅ `discrepancies/stats/route.ts` - Discrepancy stats

#### Analytics API (`app/api/analytics/`)
- ✅ `financial/route.ts` - Financial analytics
- ✅ `inventory/route.ts` - Inventory analytics

#### Auth API (`app/api/auth/`)
- ✅ `company-signup/route.ts` - Company registration

#### Dashboard API (`app/api/dashboard/`)
- ✅ `recent-orders/route.ts` - Recent orders
- ✅ `suppliers/route.ts` - Supplier stats

#### Inventory API (`app/api/inventory/`)
- ✅ `industry-categories/route.ts` - Categories
- ✅ `products/route.ts` - Products list
- ✅ `stock/alerts/route.ts` - Stock alerts
- ✅ `stock/movements/route.ts` - Stock movements

#### Other APIs
- ✅ `app/api/product-suppliers/route.ts`
- ✅ `app/api/user/industry/route.ts`

### Phase 4: Lib Actions ⚠️ PARTIALLY COMPLETE

| File | Errors | Lines | Status |
|------|--------|-------|--------|
| `lib/actions/customers.ts` | 0 | ~400 | ✅ Fixed |
| `lib/actions/brands.ts` | 1 | ~250 | ❌ Quick fix needed |
| `lib/actions/warehouses.ts` | 1 | ~300 | ❌ Quick fix needed |
| `lib/actions/categories.ts` | 2 | ~270 | ❌ Quick fix needed |
| `lib/chat-query-handlers.ts` | 3 | ~1100 | ❌ Quick fix needed |
| `lib/actions/suppliers.ts` | 16 | ~600 | ❌ REBUILD |
| `lib/actions/products.ts` | 22 | ~650 | ❌ REBUILD |
| `lib/actions/purchase-orders.ts` | 27 | ~650 | ❌ REBUILD |
| `lib/actions/inventory.ts` | 28 | ~800 | ❌ REBUILD |
| `lib/actions/orders.ts` | 54 | ~1100 | ❌ REBUILD |
| `lib/actions/orders-new.ts` | 30 | ~700 | ❌ DELETE (duplicate) |

---

## 🔴 WHAT REMAINS TO DO

### Priority 1: Quick Fixes (4 files, ~7 errors total)

These files have minor errors and can be fixed in minutes:

1. **`lib/actions/brands.ts`** - 1 error
2. **`lib/actions/warehouses.ts`** - 1 error
3. **`lib/actions/categories.ts`** - 2 errors
4. **`lib/chat-query-handlers.ts`** - 3 errors

### Priority 2: Major Rebuilds (5 files, ~147 errors total)

These files need complete rewrites to match new schema:

1. **`lib/actions/suppliers.ts`** - 16 errors
   - Remove `billingAddress` JSON field usage
   - Use structured address fields
   - Remove `supplierContact` model references
   - Use `productSuppliers` relation instead of `products`

2. **`lib/actions/products.ts`** - 22 errors
   - Remove `primaryImage`, `weight`, `dimensions` JSON fields
   - Use `weightKg`, `lengthCm`, `widthCm`, `heightCm`
   - Remove `categoryName`, `brandName` (use relations)
   - Remove `suppliers` relation (use `supplierProducts`)

3. **`lib/actions/purchase-orders.ts`** - 27 errors
   - Update status enums (no `PENDING_APPROVAL`, `SENT`, `ACKNOWLEDGED`)
   - Remove invalid includes
   - Fix item relations

4. **`lib/actions/inventory.ts`** - 28 errors
   - NO `availableQuantity` field (computed as `quantity - reservedQuantity`)
   - NO `location/locationCode` (use `zone/aisle/shelf/bin`)
   - NO `averageCost/lastCost/unitCost` on InventoryItem
   - InventoryMovement links via `inventoryItemId` only

5. **`lib/actions/orders.ts`** - 54 errors
   - NO `type/channel/priority/fulfillmentStatus`
   - NO `requiredDate/promisedDate`
   - NO `remainingQty` on OrderItem
   - OrderStatus: NO `COMPLETED` (use `DELIVERED`)
   - PaymentStatus: NO `PROCESSING/CANCELLED`

### Priority 3: Cleanup

- Delete `lib/actions/orders-new.ts` (duplicate file with errors)

---

## 🏗️ TECHNICAL ARCHITECTURE

### Directory Structure

```
Invista/
├── prisma/
│   ├── schema-neon.prisma      # Neon schema (business data)
│   ├── schema-supabase.prisma  # Supabase schema (auth)
│   ├── schema.prisma           # Legacy (ignore)
│   └── generated/
│       ├── neon/               # Generated Neon client
│       └── supabase/           # Generated Supabase client
├── lib/
│   ├── prisma/
│   │   ├── index.ts            # Exports both clients
│   │   ├── neon.ts             # Neon client singleton
│   │   ├── supabase.ts         # Supabase client singleton
│   │   └── sync.ts             # Cross-DB sync utilities
│   ├── actions/                # Server actions (NEEDS WORK)
│   │   ├── brands.ts
│   │   ├── categories.ts
│   │   ├── customers.ts        # ✅ Fixed
│   │   ├── inventory.ts        # ❌ 28 errors
│   │   ├── orders.ts           # ❌ 54 errors
│   │   ├── products.ts         # ❌ 22 errors
│   │   ├── purchase-orders.ts  # ❌ 27 errors
│   │   ├── suppliers.ts        # ❌ 16 errors
│   │   └── warehouses.ts
│   └── ...
├── app/
│   ├── api/                    # ✅ ALL FIXED
│   └── ...
└── ...
```

### Database Connections

```typescript
// Environment variables needed:
NEON_DATABASE_URL=postgresql://...      # Neon connection string
SUPABASE_DATABASE_URL=postgresql://...  # Supabase connection string
```

### Client Usage Pattern

```typescript
// Always import from lib/prisma
import { neonClient, supabaseClient } from "@/lib/prisma";

// Neon for business data
const products = await neonClient.product.findMany({
  where: { companyId },
  include: { category: true, brand: true }
});

// Supabase for auth/users
const user = await supabaseClient.user.findUnique({
  where: { id: userId }
});

// Cross-database: Get company from Supabase, products from Neon
const membership = await supabaseClient.companyMember.findFirst({
  where: { userId, isActive: true },
  include: { company: true }
});
const products = await neonClient.product.findMany({
  where: { companyId: membership.company.id }
});
```

---

## ⚠️ SCHEMA FIELD DIFFERENCES (CRITICAL)

This section documents the **OLD fields that NO LONGER EXIST** and their **NEW replacements**.

### InventoryItem

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `availableQuantity` | COMPUTED: `quantity - reservedQuantity` |
| `averageCost` | REMOVED - track in movements |
| `lastCost` | REMOVED - track in movements |
| `unitCost` | REMOVED - use Product.costPrice |
| `location` | Use `zone`, `aisle`, `shelf`, `bin` |
| `locationCode` | Build from zone/aisle/shelf/bin |

**Correct way to get available quantity:**
```typescript
const item = await neonClient.inventoryItem.findUnique({ where: { id } });
const available = item.quantity - item.reservedQuantity;
```

### InventoryMovement

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `product` / `productId` | Access via `inventoryItem.product` |
| `warehouseId` | Access via `inventoryItem.warehouse` |
| `subtype` | REMOVED |
| `unitCost` | REMOVED |
| `userId` | Use `createdById` |

**Correct way to create movement:**
```typescript
await neonClient.inventoryMovement.create({
  data: {
    inventoryItemId: item.id,  // Links to product & warehouse via item
    type: "RECEIPT",
    quantity: 10,
    quantityBefore: item.quantity,
    quantityAfter: item.quantity + 10,
    createdById: userId,
  }
});
```

### Product

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `primaryImage` | Use `images` relation with `isPrimary: true` |
| `weight` | Use `weightKg` |
| `dimensions` (JSON) | Use `lengthCm`, `widthCm`, `heightCm` |
| `categoryName` | REMOVED - use `category.name` via relation |
| `brandName` | REMOVED - use `brand.name` via relation |
| `suppliers` | Use `supplierProducts` relation |

### Customer

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `companyName` | Use `businessName` |
| `mobile` | Use `phone` |
| `taxId` | REMOVED |
| `shippingAddress` | REMOVED (use Order.shippingAddress) |

**CustomerType enum:**
- Only `INDIVIDUAL` and `BUSINESS` exist
- NO `WHOLESALE`, `RETAIL`, etc.

### Supplier

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `billingAddress` (JSON) | Use structured fields: `address1`, `address2`, `city`, `state`, `postalCode`, `country` |
| `products` relation | Use `productSuppliers` relation |
| `supplierContact` model | REMOVED - contact info on Supplier directly |

### Order

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `type` | REMOVED |
| `channel` | REMOVED |
| `priority` | REMOVED |
| `fulfillmentStatus` | Use `status` |
| `requiredDate` | REMOVED |
| `promisedDate` | REMOVED |
| `warehouse` relation | Use `warehouseId` (string, optional) |

### OrderItem

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `remainingQty` | COMPUTED: `orderedQty - shippedQty` |

### Enums Changed

**OrderStatus:**
- ✅ PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED
- ❌ NO `COMPLETED` - use `DELIVERED`

**PaymentStatus:**
- ✅ PENDING, PAID, PARTIALLY_PAID, FAILED, REFUNDED
- ❌ NO `PROCESSING`, `CANCELLED`

**PurchaseOrderStatus:**
- ✅ DRAFT, PENDING, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
- ❌ NO `PENDING_APPROVAL`, `SENT`, `ACKNOWLEDGED`

### StockReservation

| OLD Field (REMOVED) | NEW Approach |
|---------------------|--------------|
| `reservationType` | Use `reservedFor` (string) |
| `referenceType` | Combined into `reservedFor` |

### Model Renames

| OLD Name | NEW Name |
|----------|----------|
| `CompanyUser` | `CompanyMember` |

---

## 📁 FILE-BY-FILE STATUS

### ✅ Completely Fixed Files

```
lib/prisma/index.ts
lib/prisma/neon.ts
lib/prisma/supabase.ts
lib/prisma/sync.ts
lib/actions/customers.ts

app/api/audits/route.ts
app/api/audits/[id]/route.ts
app/api/audits/[id]/items/route.ts
app/api/audits/stats/route.ts
app/api/audits/compliance/route.ts
app/api/audits/compliance/trends/route.ts
app/api/audits/cycle-counting/route.ts
app/api/audits/cycle-counting/schedule/route.ts
app/api/audits/cycle-counting/stats/route.ts
app/api/audits/discrepancies/route.ts
app/api/audits/discrepancies/stats/route.ts
app/api/analytics/financial/route.ts
app/api/analytics/inventory/route.ts
app/api/auth/company-signup/route.ts
app/api/dashboard/recent-orders/route.ts
app/api/dashboard/suppliers/route.ts
app/api/inventory/industry-categories/route.ts
app/api/inventory/products/route.ts
app/api/inventory/stock/alerts/route.ts
app/api/inventory/stock/movements/route.ts
app/api/product-suppliers/route.ts
app/api/user/industry/route.ts
```

### ❌ Files Needing Work

```
lib/actions/brands.ts           # 1 error - QUICK FIX
lib/actions/warehouses.ts       # 1 error - QUICK FIX
lib/actions/categories.ts       # 2 errors - QUICK FIX
lib/chat-query-handlers.ts      # 3 errors - QUICK FIX
lib/actions/suppliers.ts        # 16 errors - REBUILD
lib/actions/products.ts         # 22 errors - REBUILD
lib/actions/purchase-orders.ts  # 27 errors - REBUILD
lib/actions/inventory.ts        # 28 errors - REBUILD
lib/actions/orders.ts           # 54 errors - REBUILD
lib/actions/orders-new.ts       # 30 errors - DELETE (duplicate)
```

---

## 🔧 COMMON PATTERNS AND SOLUTIONS

### Pattern 1: Removing Invalid Includes

**OLD (broken):**
```typescript
const product = await neonClient.product.findUnique({
  where: { id },
  include: {
    category: true,
    brand: true,
    suppliers: true,  // ❌ WRONG - relation doesn't exist
  }
});
```

**NEW (fixed):**
```typescript
const product = await neonClient.product.findUnique({
  where: { id },
  include: {
    category: true,
    brand: true,
    supplierProducts: {  // ✅ CORRECT - use junction table
      include: { supplier: true }
    }
  }
});
```

### Pattern 2: Computing Available Quantity

**OLD (broken):**
```typescript
const available = item.availableQuantity;  // ❌ Field doesn't exist
```

**NEW (fixed):**
```typescript
const available = item.quantity - item.reservedQuantity;  // ✅ Computed
```

### Pattern 3: Location Fields

**OLD (broken):**
```typescript
await neonClient.inventoryItem.create({
  data: {
    location: "A-1-2-3",      // ❌ Field doesn't exist
    locationCode: "SHELF-A1", // ❌ Field doesn't exist
  }
});
```

**NEW (fixed):**
```typescript
await neonClient.inventoryItem.create({
  data: {
    zone: "A",
    aisle: "1",
    shelf: "2",
    bin: "3",
  }
});
```

### Pattern 4: Customer Business Name

**OLD (broken):**
```typescript
const name = customer.companyName;  // ❌ Field doesn't exist
```

**NEW (fixed):**
```typescript
const name = customer.businessName;  // ✅ Correct field
```

### Pattern 5: Movement Creation

**OLD (broken):**
```typescript
await neonClient.inventoryMovement.create({
  data: {
    productId: product.id,      // ❌ No direct relation
    warehouseId: warehouse.id,  // ❌ No direct relation
    userId: user.id,            // ❌ Wrong field name
  }
});
```

**NEW (fixed):**
```typescript
await neonClient.inventoryMovement.create({
  data: {
    inventoryItemId: item.id,   // ✅ Links to product/warehouse via item
    createdById: user.id,       // ✅ Correct field name
  }
});
```

### Pattern 6: Order Status

**OLD (broken):**
```typescript
status: "COMPLETED"  // ❌ Not in enum
```

**NEW (fixed):**
```typescript
status: "DELIVERED"  // ✅ Correct enum value
```

---

## 🚀 HOW TO CONTINUE

### For AI Assistants

When continuing this work:

1. **Read this document first** - It has all context you need
2. **Check the schema files** - `prisma/schema-neon.prisma` and `prisma/schema-supabase.prisma`
3. **Use the field differences table** - Section 6 has all OLD→NEW mappings
4. **Follow the patterns** - Section 8 shows common fixes

### For Human Developers

1. **Quick fixes first:**
   ```bash
   # Run TypeScript check to see current errors
   npx tsc --noEmit 2>&1 | findstr "error TS"
   ```

2. **Fix in order:**
   - `lib/actions/brands.ts` (1 error)
   - `lib/actions/warehouses.ts` (1 error)
   - `lib/actions/categories.ts` (2 errors)
   - `lib/chat-query-handlers.ts` (3 errors)

3. **Rebuild major files** (use schema as reference):
   - `lib/actions/suppliers.ts`
   - `lib/actions/products.ts`
   - `lib/actions/purchase-orders.ts`
   - `lib/actions/inventory.ts`
   - `lib/actions/orders.ts`

4. **Delete duplicate:**
   - Remove `lib/actions/orders-new.ts`

### Verification Commands

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Count errors per file
npx tsc --noEmit 2>&1 | findstr "error TS" | ForEach-Object { $_.Split('(')[0] } | Group-Object | Select-Object Name, Count | Sort-Object Count -Descending

# Regenerate Prisma clients (if schema changes)
npx prisma generate --schema=prisma/schema-neon.prisma
npx prisma generate --schema=prisma/schema-supabase.prisma

# Push schema changes to database
npx prisma db push --schema=prisma/schema-neon.prisma
npx prisma db push --schema=prisma/schema-supabase.prisma
```

---

## 📊 PROGRESS SUMMARY

| Category | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| API Routes | 27+ | 27+ | 0 |
| Lib/Prisma | 4 | 4 | 0 |
| Lib/Actions | 11 | 1 | 10 |
| **Total Errors** | **184** | **~30** | **~154** |

---

## 🔗 KEY FILES TO REFERENCE

1. **Neon Schema:** `prisma/schema-neon.prisma`
2. **Supabase Schema:** `prisma/schema-supabase.prisma`
3. **Prisma Clients:** `lib/prisma/index.ts`
4. **This Context:** `AI_CONTEXT_DOCUMENT.md`
5. **Table Pathway:** `TABLE_CREATION_PATHWAY.md`

---

## 💡 TIPS FOR REBUILDING FILES

When rebuilding a file like `lib/actions/orders.ts`:

1. **Start fresh** - Don't try to fix 54 errors, rewrite from scratch
2. **Check the schema** - Copy model from `schema-neon.prisma`
3. **Define interfaces** - Match Prisma types exactly
4. **Use select/include carefully** - Only include relations that exist
5. **Test incrementally** - Run `npx tsc --noEmit` after each function

### Template for Server Actions

```typescript
"use server";

import { neonClient } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Define input types based on schema
interface CreateOrderInput {
  companyId: string;
  customerId: string;
  orderNumber: string;
  // ... only fields that exist in schema
}

export async function createOrder(data: CreateOrderInput) {
  try {
    const order = await neonClient.order.create({
      data: {
        companyId: data.companyId,
        customerId: data.customerId,
        orderNumber: data.orderNumber,
        subtotal: 0,
        totalAmount: 0,
        status: "PENDING",
        paymentStatus: "PENDING",
        createdById: data.createdById,
      },
      include: {
        customer: true,
        items: true,
      }
    });
    
    revalidatePath("/orders");
    return { success: true, data: order };
  } catch (error) {
    console.error("Error creating order:", error);
    return { success: false, error: "Failed to create order" };
  }
}
```

---

**End of Context Document**

*This document should be kept updated as work progresses. After completing fixes, update the status tables and progress summary.*
