# 🗺️ DATABASE REBUILD - TABLE CREATION PATHWAY

## Step-by-Step Guide: Create Tables in Dependency Order

This guide shows you **exactly which tables to create in order**, ensuring foreign key dependencies are satisfied.

---

## 📋 CREATION ORDER OVERVIEW

**Phase 1:** Base tables (no foreign keys) - 7 tables
**Phase 2:** Dependent tables (1 level deep) - 12 tables
**Phase 3:** Junction/Detail tables (2+ levels deep) - 17 tables

**Total:** 36 tables across 2 databases

- **Supabase:** 13 tables
- **Neon:** 23 tables

---

# 🔵 SUPABASE DATABASE - 14 TABLES

## **PHASE 1: BASE TABLES (No Dependencies)**

### ✅ Step 1: Create `User` Table

**Why first:** Everything else references users

```prisma
model User {
  id               String    @id @default(uuid())
  email            String    @unique
  emailVerified    Boolean   @default(false)
  firstName        String?
  lastName         String?
  displayName      String?
  avatar           String?
  phone            String?
  passwordHash     String?

  // Security
  twoFactorEnabled Boolean   @default(false)
  twoFactorSecret  String?
  isActive         Boolean   @default(true)
  isSuspended      Boolean   @default(false)
  suspendedReason  String?
  lastLoginAt      DateTime?

  // Audit
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@map("users")
}
```

**Test:**

```sql
-- After migration, verify table exists
SELECT * FROM users LIMIT 1;
```

---

### ✅ Step 2: Create `Company` Table

**Depends on:** User (createdById)

```prisma
model Company {
  id                 String             @id @default(uuid())
  name               String
  slug               String             @unique
  displayName        String?
  description        String?

  // Contact
  email              String?
  phone              String?
  website            String?

  // Structured Address
  address1           String?
  address2           String?
  city               String?
  state              String?
  postalCode         String?
  country            String?            @default("US")

  // Business Info
  industry           String?
  taxId              String?            @unique
  registrationNumber String?            @unique
  businessType       BusinessType?

  // Branding
  logo               String?
  primaryColor       String?

  // Subscription
  plan               SubscriptionPlan   @default(FREE)
  planStatus         SubscriptionStatus @default(TRIAL)
  trialEndsAt        DateTime?
  maxUsers           Int                @default(5)
  maxProducts        Int                @default(100)
  maxWarehouses      Int                @default(1)

  // Status
  isActive           Boolean            @default(true)
  isSuspended        Boolean            @default(false)

  // Audit
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  createdById        String

  // Relations
  createdBy          User               @relation("CompanyCreator", fields: [createdById], references: [id])

  @@index([slug])
  @@index([createdById])
  @@index([isActive])
  @@map("companies")
}
```

**Test:**

```typescript
// Create first company
const company = await supabaseClient.company.create({
  data: {
    name: "Test Company",
    slug: "test-company",
    createdById: userId,
  },
});
```

---

## **PHASE 2: DEPENDENT TABLES**

### ✅ Step 3: Create `CompanyMember` Table

**Depends on:** User, Company

```prisma
model CompanyMember {
  id           String      @id @default(uuid())
  companyId    String
  userId       String
  role         CompanyRole @default(EMPLOYEE)
  title        String?
  departmentId String?

  // Status
  isActive     Boolean     @default(true)
  isOwner      Boolean     @default(false)
  canInvite    Boolean     @default(false)

  // Dates
  joinedAt     DateTime    @default(now())
  invitedAt    DateTime?
  invitedById  String?

  // Relations
  company      Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([companyId, userId])
  @@index([userId])
  @@index([companyId, isActive])
  @@map("company_members")
}
```

---

### ✅ Step 4: Create `UserSession` Table

**Depends on:** User

```prisma
model UserSession {
  id           String    @id @default(uuid())
  userId       String
  token        String    @unique
  refreshToken String?   @unique

  // Device info
  userAgent    String?
  ipAddress    String?
  deviceType   String?
  browser      String?

  // Lifecycle
  lastActivity DateTime  @default(now())
  expiresAt    DateTime
  isActive     Boolean   @default(true)
  isRevoked    Boolean   @default(false)
  revokedAt    DateTime?

  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("user_sessions")
}
```

---

### ✅ Step 5: Create `LoginHistory` Table

**Depends on:** User

```prisma
model LoginHistory {
  id          String   @id @default(uuid())
  userId      String
  successful  Boolean
  failReason  String?
  ipAddress   String
  userAgent   String?
  location    String?
  attemptedAt DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([attemptedAt])
  @@map("login_history")
}
```

---

### ✅ Step 6: Create `AuditLog` Table

**Depends on:** Nothing (companyId/userId are optional)

```prisma
model AuditLog {
  id         String        @id @default(uuid())
  companyId  String?
  userId     String?
  userEmail  String?

  action     String
  resource   String
  resourceId String?

  oldValues  Json?
  newValues  Json?

  ipAddress  String?
  userAgent  String?

  severity   AuditSeverity @default(INFO)
  timestamp  DateTime      @default(now())

  @@index([companyId, timestamp])
  @@index([userId, timestamp])
  @@index([resource, timestamp])
  @@map("audit_logs")
}
```

---

### ✅ Step 7-14: Create Remaining Supabase Tables

**Step 7:** `CompanyLocation` (depends on Company)
**Step 8:** `CompanyInvite` (depends on User)
**Step 9:** `CompanyIntegration` (depends on Company, User)
**Step 10:** `UserInvitation` (depends on Company, User)
**Step 11:** `UserPreference` (depends on User)
**Step 12:** `UserNotification` (depends on User)
**Step 13:** `BillingHistory` (depends on Company)

_(Full schemas provided in NEW_schema_supabase_v2.prisma)_

---

# 🟢 NEON DATABASE - 20 TABLES

## **PHASE 1: BASE TABLES (No Dependencies)**

### ✅ Step 15: Create `Category` Table

**Why first:** Products depend on categories

```prisma
model Category {
  id           String     @id @default(uuid())
  companyId    String     // Reference to Supabase Company
  name         String
  slug         String
  description  String?
  parentId     String?    // Self-reference for hierarchy
  displayOrder Int        @default(0)
  icon         String?
  color        String?
  isActive     Boolean    @default(true)

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relations
  parent       Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Restrict)
  children     Category[] @relation("CategoryTree")

  @@unique([companyId, slug])
  @@index([companyId, parentId])
  @@index([companyId, isActive])
  @@map("categories")
}
```

**Test:**

```typescript
// Create root category
const electronics = await neonClient.category.create({
  data: {
    companyId: company.id,
    name: "Electronics",
    slug: "electronics",
  },
});

// Create child category
const laptops = await neonClient.category.create({
  data: {
    companyId: company.id,
    name: "Laptops",
    slug: "laptops",
    parentId: electronics.id,
  },
});
```

---

### ✅ Step 16: Create `Brand` Table

**Why now:** Products depend on brands

```prisma
model Brand {
  id          String    @id @default(uuid())
  companyId   String
  name        String
  slug        String
  description String?
  logo        String?
  website     String?
  isActive    Boolean   @default(true)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([companyId, slug])
  @@index([companyId, isActive])
  @@map("brands")
}
```

---

### ✅ Step 17: Create `Tag` Table

**Why now:** Products use tags via junction table

```prisma
model Tag {
  id        String       @id @default(uuid())
  companyId String
  name      String
  slug      String

  @@unique([companyId, slug])
  @@map("tags")
}
```

---

### ✅ Step 18: Create `Warehouse` Table

**Why now:** Inventory depends on warehouses

```prisma
model Warehouse {
  id          String        @id @default(uuid())
  companyId   String
  name        String
  code        String
  description String?

  // Structured address
  address1    String?
  address2    String?
  city        String?
  state       String?
  postalCode  String?
  country     String?

  // Coordinates
  latitude    Decimal?      @db.Decimal(10, 8)
  longitude   Decimal?      @db.Decimal(11, 8)

  type        WarehouseType @default(STANDARD)
  isActive    Boolean       @default(true)

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([companyId, code])
  @@index([companyId, isActive])
  @@map("warehouses")
}
```

---

### ✅ Step 19: Create `Supplier` Table

**Why now:** Needed before PurchaseOrder

```prisma
model Supplier {
  id              String         @id @default(uuid())
  companyId       String
  name            String
  code            String
  email           String?
  phone           String?
  website         String?

  // Structured address
  address1        String?
  address2        String?
  city            String?
  state           String?
  postalCode      String?
  country         String?

  // Business info
  taxId           String?
  paymentTerms    String?
  currency        String         @default("USD")

  status          SupplierStatus @default(ACTIVE)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdById     String

  @@unique([companyId, code])
  @@index([companyId, status])
  @@map("suppliers")
}
```

---

### ✅ Step 20: Create `Customer` Table

**Why now:** Needed before Order

```prisma
model Customer {
  id              String         @id @default(uuid())
  companyId       String
  customerNumber  String
  type            CustomerType   @default(INDIVIDUAL)

  // For individuals
  firstName       String?
  lastName        String?

  // For businesses
  businessName    String?

  email           String?
  phone           String?

  // Structured billing address
  billingAddress1  String?
  billingAddress2  String?
  billingCity      String?
  billingState     String?
  billingPostalCode String?
  billingCountry   String?

  status          CustomerStatus @default(ACTIVE)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdById     String

  @@unique([companyId, customerNumber])
  @@index([companyId, status])
  @@index([email])
  @@map("customers")
}
```

---

## **PHASE 2: PRODUCT TABLES**

### ✅ Step 21: Create `Product` Table

**Depends on:** Category, Brand

```prisma
model Product {
  id              String         @id @default(uuid())
  companyId       String
  categoryId      String?
  brandId         String?

  // Basic info
  name            String
  sku             String
  barcode         String?
  description     String?

  // Dimensions (structured)
  lengthCm        Decimal?       @db.Decimal(10, 2)
  widthCm         Decimal?       @db.Decimal(10, 2)
  heightCm        Decimal?       @db.Decimal(10, 2)
  weightKg        Decimal?       @db.Decimal(10, 3)

  // Pricing
  costPrice       Decimal?       @db.Decimal(12, 2)
  sellingPrice    Decimal?       @db.Decimal(12, 2)
  wholesalePrice  Decimal?       @db.Decimal(12, 2)

  // Inventory config
  minStock        Int            @default(10)
  reorderPoint    Int            @default(50)

  // Product type
  status          ProductStatus  @default(ACTIVE)
  isTrackable     Boolean        @default(true)
  isSerialized    Boolean        @default(false)

  // Audit
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdById     String

  // ✅ PROPER RELATIONS
  category        Category?      @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  brand           Brand?         @relation(fields: [brandId], references: [id], onDelete: SetNull)

  @@unique([companyId, sku])
  @@index([companyId, status])
  @@index([companyId, categoryId])
  @@index([companyId, brandId])
  @@map("products")
}
```

**Test:**

```typescript
// Create first product
const product = await neonClient.product.create({
  data: {
    companyId: company.id,
    categoryId: laptops.id,
    brandId: brand.id,
    name: "Dell XPS 13",
    sku: "DELL-XPS-13",
    costPrice: 800,
    sellingPrice: 1200,
    createdById: userId,
  },
  include: {
    category: true, // ✅ This works now!
    brand: true, // ✅ This works now!
  },
});
```

---

### ✅ Step 22-25: Create Product-Related Tables

**Step 22:** `ProductVariant` (depends on Product)
**Step 23:** `VariantAttribute` (depends on ProductVariant)
**Step 24:** `ProductImage` (depends on Product)
**Step 25:** `ProductTag` (junction: Product ↔ Tag)

---

## **PHASE 3: INVENTORY TABLES**

### ✅ Step 26: Create `InventoryItem` Table

**Depends on:** Product, ProductVariant, Warehouse

```prisma
model InventoryItem {
  id                String          @id @default(uuid())
  productId         String
  variantId         String?
  warehouseId       String

  // Location within warehouse
  zone              String?
  aisle             String?
  shelf             String?
  bin               String?

  // Quantities
  quantity          Int             @default(0)
  reservedQuantity  Int             @default(0)

  // Lot tracking
  lotNumber         String?
  batchNumber       String?
  expiryDate        DateTime?

  status            InventoryStatus @default(AVAILABLE)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  product           Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant           ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)
  warehouse         Warehouse       @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@unique([productId, variantId, warehouseId, lotNumber])
  @@index([warehouseId, status])
  @@index([productId])
  @@map("inventory_items")
}
```

**Test:**

```typescript
// Add inventory to warehouse
const inventory = await neonClient.inventoryItem.create({
  data: {
    productId: product.id,
    warehouseId: warehouse.id,
    quantity: 100,
    reservedQuantity: 0,
  },
});

// Calculate available stock
const available = inventory.quantity - inventory.reservedQuantity; // 100
```

---

### ✅ Step 27-34: Create Remaining Tables

**Step 27:** `InventoryMovement` (depends on InventoryItem)
**Step 28:** `StockReservation` (depends on InventoryItem)
**Step 29:** `InventoryAudit`
**Step 30:** `InventoryAuditItem` (depends on InventoryAudit, InventoryItem)
**Step 31:** `ProductSupplier` (junction: Product ↔ Supplier)
**Step 32:** `PurchaseOrder` (depends on Supplier)
**Step 33:** `PurchaseOrderItem` (depends on PurchaseOrder, Product)
**Step 34:** `Order` (depends on Customer)
**Step 35:** `OrderItem` (depends on Order, Product)
**Step 36:** `ProductReview` (depends on Product)
**Step 37:** `RagDocument`

---

# ✅ VERIFICATION CHECKLIST

After creating all tables, test the core relationships:

## Test 1: Product with Relations

```typescript
const productWithEverything = await neonClient.product.findUnique({
  where: { id: productId },
  include: {
    category: true, // ✅ Works!
    brand: true, // ✅ Works!
    variants: true,
    images: true,
    tags: { include: { tag: true } },
    inventoryItems: {
      include: { warehouse: true },
    },
  },
});
```

## Test 2: Stock Calculation

```typescript
const stock = await neonClient.inventoryItem.aggregate({
  where: { productId },
  _sum: {
    quantity: true,
    reservedQuantity: true,
  },
});

const totalStock = stock._sum.quantity || 0;
const available = totalStock - (stock._sum.reservedQuantity || 0);
```

## Test 3: Company Context

```typescript
// Get user's company
const membership = await supabaseClient.companyMember.findFirst({
  where: { userId, isActive: true },
  include: { company: true },
});

// Get company's products
const products = await neonClient.product.findMany({
  where: { companyId: membership.company.id },
});
```

---

# 🚀 NEXT STEPS AFTER ALL TABLES CREATED

1. ✅ Run `npx prisma migrate dev` for both databases
2. ✅ Generate Prisma clients
3. ✅ Set up client files (`lib/prisma/supabase.ts`, `lib/prisma/neon.ts`)
4. ✅ Build API routes
5. ✅ Update frontend components
6. ✅ Test end-to-end

---

**Follow this exact order and you'll have zero dependency errors! 🎯**
