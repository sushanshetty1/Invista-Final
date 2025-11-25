# 🚀 INVISTA REBUILD - IMPLEMENTATION GUIDE

## OVERVIEW

**Duration:** 3-4 weeks
**Architecture:** Dual database (Supabase + Neon) done properly
**Current Status:** Schemas created, ready to implement

---

## WEEK 1: DATABASE SETUP & SCHEMA

### Step 1: Backup Current System

```bash
# 1. Backup your current Prisma schemas
cp prisma/schema-neon.prisma prisma/OLD_schema-neon.prisma.backup
cp prisma/schema-supabase.prisma prisma/OLD_schema-supabase.prisma.backup

# 2. Export important data (if any)
# Create SQL dumps of critical data you want to keep
```

### Step 2: Replace Prisma Schemas

```bash
# 1. Copy new schemas from artifacts folder
cp .gemini/antigravity/brain/4ddc60bb-6ec3-427d-b806-b6efbffc214c/NEW_schema_supabase_v2.prisma prisma/schema-supabase.prisma

cp .gemini/antigravity/brain/4ddc60bb-6ec3-427d-b806-b6efbffc214c/NEW_schema_neon_v2.prisma prisma/schema-neon.prisma
```

### Step 3: Generate Prisma Clients

```bash
# Generate both clients
npx prisma generate --schema=prisma/schema-supabase.prisma
npx prisma generate --schema=prisma/schema-neon.prisma
```

### Step 4: Create Migration Scripts

```bash
# Create migrations for Supabase
npx prisma migrate dev --name init_v2 --schema=prisma/schema-supabase.prisma

# Create migrations for Neon
npx prisma migrate dev --name init_v2 --schema=prisma/schema-neon.prisma
```

### Step 5: Create Prisma Client Files

Create `lib/prisma/supabase.ts`:

```typescript
import { PrismaClient } from "@/prisma/generated/supabase";

const globalForPrisma = globalThis as unknown as {
  supabase: PrismaClient | undefined;
};

export const supabaseClient =
  globalForPrisma.supabase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.supabase = supabaseClient;
}
```

Create `lib/prisma/neon.ts`:

```typescript
import { PrismaClient } from "@/prisma/generated/neon";

const globalForPrisma = globalThis as unknown as {
  neon: PrismaClient | undefined;
};

export const neonClient =
  globalForPrisma.neon ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.neon = neonClient;
}
```

Create `lib/db.ts` (unified export):

```typescript
export { supabaseClient } from "./prisma/supabase";
export { neonClient } from "./prisma/neon";

// Helper to get company for a user
export async function getUserCompany(userId: string) {
  const { supabaseClient } = await import("./prisma/supabase");

  const membership = await supabaseClient.companyMember.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      company: true,
    },
  });

  if (!membership) {
    throw new Error("User not associated with any company");
  }

  return {
    company: membership.company,
    role: membership.role,
    isOwner: membership.isOwner,
  };
}
```

---

## WEEK 2-3: REBUILD API ROUTES

### Example: Products API (Proper Implementation)

Create `app/api/products/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { neonClient } from "@/lib/db";
import { authenticate } from "@/lib/auth";
import { getUserCompany } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get user's company from Supabase
    const { company } = await getUserCompany(authResult.user.id);

    // 3. Query products from Neon with PROPER RELATIONS
    const products = await neonClient.product.findMany({
      where: {
        companyId: company.id,
      },
      include: {
        category: true, // ✅ Works now!
        brand: true, // ✅ Works now!
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 4. Calculate stock for each product (aggregate from inventory)
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const stockAgg = await neonClient.inventoryItem.aggregate({
          where: {
            productId: product.id,
          },
          _sum: {
            quantity: true,
            reservedQuantity: true,
          },
        });

        const totalStock = stockAgg._sum.quantity || 0;
        const reservedStock = stockAgg._sum.reservedQuantity || 0;
        const availableStock = totalStock - reservedStock;

        return {
          ...product,
          // ✅ Computed values, not stored
          totalStock,
          reservedStock,
          availableStock,
          // ✅ Now you can access category.name and brand.name!
          categoryName: product.category?.name,
          brandName: product.brand?.name,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: productsWithStock,
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { company } = await getUserCompany(authResult.user.id);
    const body = await request.json();

    // ✅ Create product with proper relations
    const product = await neonClient.product.create({
      data: {
        companyId: company.id,
        name: body.name,
        sku: body.sku,
        description: body.description,

        // ✅ Connect to category/brand via ID only (no redundant names!)
        categoryId: body.categoryId,
        brandId: body.brandId,

        // Dimensions (structured, not JSON!)
        lengthCm: body.lengthCm,
        widthCm: body.widthCm,
        heightCm: body.heightCm,
        weightKg: body.weightKg,

        // Pricing
        costPrice: body.costPrice,
        sellingPrice: body.sellingPrice,

        // Inventory config
        minStock: body.minStock || 10,
        reorderPoint: body.reorderPoint || 50,

        status: body.status || "ACTIVE",
        createdById: authResult.user.id,
      },
      include: {
        category: true,
        brand: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
```

### Example: Stock Status Helper

Create `lib/helpers/inventory.ts`:

```typescript
import { neonClient } from "@/lib/db";

export async function getProductStock(productId: string) {
  const stockAgg = await neonClient.inventoryItem.aggregate({
    where: { productId },
    _sum: {
      quantity: true,
      reservedQuantity: true,
    },
  });

  const total = stockAgg._sum.quantity || 0;
  const reserved = stockAgg._sum.reservedQuantity || 0;
  const available = total - reserved;

  return { total, reserved, available };
}

export function getStockStatus(
  availableStock: number,
  minStock: number,
  reorderPoint: number
): "out_of_stock" | "low_stock" | "in_stock" {
  if (availableStock === 0) {
    return "out_of_stock";
  }
  if (availableStock < reorderPoint) {
    return "low_stock";
  }
  return "in_stock";
}

export async function getProductWithStock(productId: string) {
  const product = await neonClient.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      brand: true,
    },
  });

  if (!product) return null;

  const stock = await getProductStock(productId);

  return {
    ...product,
    totalStock: stock.total,
    reservedStock: stock.reserved,
    availableStock: stock.available,
    stockStatus: getStockStatus(
      stock.available,
      product.minStock,
      product.reorderPoint
    ),
  };
}
```

---

## WEEK 4: UPDATE FRONTEND & TEST

### Update Products Page

```typescript
// app/inventory/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  minStock: number;
  reorderPoint: number;
  status: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
        }
      });
  }, []);

  const getStockBadge = (product: ProductWithStock) => {
    if (product.availableStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (product.availableStock < product.reorderPoint) {
      return <Badge variant="warning">Low Stock</Badge>;
    }
    return <Badge variant="success">In Stock</Badge>;
  };

  return (
    <div>
      <h1>Products</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Available Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.sku}</td>
              <td>{product.category?.name || "-"}</td>
              <td>{product.brand?.name || "-"}</td>
              <td>
                {product.availableStock} / {product.totalStock}
                {product.reservedStock > 0 &&
                  ` (${product.reservedStock} reserved)`}
              </td>
              <td>{getStockBadge(product)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## TESTING CHECKLIST

### Database Level

- [ ] Both migrations ran successfully
- [ ] Can create users in Supabase
- [ ] Can create companies in Supabase
- [ ] Can add company members
- [ ] Can create categories in Neon
- [ ] Can create brands in Neon
- [ ] Can create products with category/brand relations
- [ ] Can query product with `include: { category, brand }`
- [ ] Can create inventory items
- [ ] Stock aggregations work correctly

### API Level

- [ ] Authentication works
- [ ] GET /api/products returns products with stock
- [ ] POST /api/products creates products correctly
- [ ] Category/Brand names appear via relations
- [ ] Stock calculations are accurate
- [ ] Company scoping works (users only see their company data)

### Frontend Level

- [ ] Products page displays correctly
- [ ] Stock status badges show correct status
- [ ] Can create new products
- [ ] Can edit products
- [ ] Category/Brand dropdowns work

---

## KEY IMPROVEMENTS OVER OLD SCHEMA

✅ **Product → Category/Brand relations WORK**
✅ **No more denormalized categoryName/brandName**
✅ **Stock calculated from InventoryItem, not stored in Product**
✅ **Addresses are structured, not JSON**
✅ **All unique constraints include companyId**
✅ **No duplicate tables**
✅ **Clean, maintainable code**

---

## DEPLOYMENT

```bash
# 1. Run migrations on production databases
npm run db:migrate:deploy

# 2. Generate production clients
npm run db:generate

# 3. Build and deploy
npm run build
```

---

## ROLLBACK PLAN

If you need to rollback:

```bash
# 1. Restore old schemas
cp prisma/OLD_schema-neon.prisma.backup prisma/schema-neon.prisma
cp prisma/OLD_schema-supabase.prisma.backup prisma/schema-supabase.prisma

# 2. Regenerate old clients
npx prisma generate --schema=prisma/schema-supabase.prisma
npx prisma generate --schema=prisma/schema-neon.prisma

# 3. Rollback migrations
npx prisma migrate reset
```

**But you won't need this - the new schema is way better! 🚀**
