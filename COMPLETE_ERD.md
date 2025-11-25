# 🗺️ INVISTA DATABASE - COMPLETE ENTITY RELATIONSHIP DIAGRAM

## NEW PROPER SCHEMA (V2) - ALL TABLES & RELATIONSHIPS

---

## FULL SYSTEM ARCHITECTURE

```mermaid
graph TB
    subgraph SUPABASE["☁️ SUPABASE DATABASE (Authentication & Companies)"]
        direction TB

        subgraph AUTH["🔐 Authentication"]
            User[("👤 User<br/>━━━━━━━━━━<br/>id (PK)<br/>email (UK)<br/>firstName<br/>lastName<br/>passwordHash<br/>isActive")]

            Session[("🎫 UserSession<br/>━━━━━━━━━━<br/>id (PK)<br/>userId (FK)<br/>token (UK)<br/>expiresAt<br/>isActive")]

            LoginHist[("📊 LoginHistory<br/>━━━━━━━━━━<br/>id (PK)<br/>userId (FK)<br/>successful<br/>ipAddress<br/>attemptedAt")]
        end

        subgraph COMPANY["🏢 Company Management"]
            Company[("🏛️ Company<br/>━━━━━━━━━━<br/>id (PK)<br/>name<br/>slug (UK)<br/>address1<br/>city<br/>plan<br/>planStatus<br/>createdById (FK)")]

            Member[("👥 CompanyMember<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId (FK)<br/>userId (FK)<br/>role<br/>isActive<br/>isOwner")]
        end

        subgraph AUDIT_S["📝 Audit"]
            AuditLog[("📋 AuditLog<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>userId<br/>action<br/>resource<br/>timestamp")]
        end
    end

    subgraph NEON["🗄️ NEON DATABASE (Business Operations)"]
        direction TB

        subgraph CATALOG["📦 Product Catalog"]
            Category[("📁 Category<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>name<br/>slug<br/>parentId (FK)<br/>isActive")]

            Brand[("🏷️ Brand<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>name<br/>slug<br/>isActive")]

            Product[("📦 Product<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>categoryId (FK)<br/>brandId (FK)<br/>sku (UK)<br/>name<br/>costPrice<br/>sellingPrice<br/>minStock<br/>reorderPoint<br/>createdById")]

            Variant[("🔄 ProductVariant<br/>━━━━━━━━━━<br/>id (PK)<br/>productId (FK)<br/>name<br/>sku<br/>costPrice")]

            VarAttr[("⚙️ VariantAttribute<br/>━━━━━━━━━━<br/>id (PK)<br/>variantId (FK)<br/>name<br/>value")]

            Image[("🖼️ ProductImage<br/>━━━━━━━━━━<br/>id (PK)<br/>productId (FK)<br/>url<br/>isPrimary<br/>order")]

            Tag[("🏷️ Tag<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>name<br/>slug")]

            ProdTag[("🔗 ProductTag<br/>━━━━━━━━━━<br/>productId (FK)<br/>tagId (FK)")]
        end

        subgraph WAREHOUSE["🏭 Warehouse & Inventory"]
            Warehouse[("🏬 Warehouse<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>code (UK)<br/>name<br/>address1<br/>city<br/>type<br/>isActive")]

            Inventory[("📊 InventoryItem<br/>━━━━━━━━━━<br/>id (PK)<br/>productId (FK)<br/>variantId (FK)<br/>warehouseId (FK)<br/>quantity<br/>reservedQuantity<br/>lotNumber<br/>status")]

            Movement[("↔️ InventoryMovement<br/>━━━━━━━━━━<br/>id (PK)<br/>inventoryItemId (FK)<br/>type<br/>quantity<br/>quantityBefore<br/>quantityAfter<br/>createdById<br/>occurredAt")]
        end

        subgraph PURCHASING["🛒 Suppliers & Purchasing"]
            Supplier[("🏭 Supplier<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>code (UK)<br/>name<br/>email<br/>address1<br/>status<br/>createdById")]

            ProdSupp[("🔗 ProductSupplier<br/>━━━━━━━━━━<br/>id (PK)<br/>productId (FK)<br/>supplierId (FK)<br/>unitCost<br/>leadTimeDays<br/>isPreferred")]

            PO[("📝 PurchaseOrder<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>orderNumber (UK)<br/>supplierId (FK)<br/>totalAmount<br/>status<br/>orderDate<br/>createdById")]

            POItem[("📋 PurchaseOrderItem<br/>━━━━━━━━━━<br/>id (PK)<br/>purchaseOrderId (FK)<br/>productId (FK)<br/>variantId (FK)<br/>orderedQty<br/>receivedQty<br/>unitCost")]
        end

        subgraph SALES["💰 Customers & Orders"]
            Customer[("👤 Customer<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>customerNumber (UK)<br/>type<br/>firstName<br/>businessName<br/>email<br/>status<br/>createdById")]

            Order[("🛍️ Order<br/>━━━━━━━━━━<br/>id (PK)<br/>companyId<br/>orderNumber (UK)<br/>customerId (FK)<br/>totalAmount<br/>status<br/>paymentStatus<br/>orderDate<br/>createdById")]

            OrderItem[("📋 OrderItem<br/>━━━━━━━━━━<br/>id (PK)<br/>orderId (FK)<br/>productId (FK)<br/>variantId (FK)<br/>orderedQty<br/>shippedQty<br/>unitPrice")]
        end
    end

    %% SUPABASE RELATIONSHIPS
    User -->|1:N| Session
    User -->|1:N| LoginHist
    User -->|1:N creates| Company
    User -->|N:M via| Member
    Company -->|N:M via| Member

    %% NEON CATALOG RELATIONSHIPS
    Category -->|1:N parent-child| Category
    Category -->|1:N| Product
    Brand -->|1:N| Product
    Product -->|1:N| Variant
    Product -->|1:N| Image
    Product -->|N:M via| ProdTag
    Tag -->|N:M via| ProdTag
    Variant -->|1:N| VarAttr

    %% NEON INVENTORY RELATIONSHIPS
    Warehouse -->|1:N| Inventory
    Product -->|1:N| Inventory
    Variant -->|1:N| Inventory
    Inventory -->|1:N| Movement

    %% NEON PURCHASING RELATIONSHIPS
    Supplier -->|1:N| PO
    Supplier -->|N:M via| ProdSupp
    Product -->|N:M via| ProdSupp
    PO -->|1:N| POItem
    Product -->|1:N| POItem
    Variant -->|1:N| POItem

    %% NEON SALES RELATIONSHIPS
    Customer -->|1:N| Order
    Order -->|1:N| OrderItem
    Product -->|1:N| OrderItem
    Variant -->|1:N| OrderItem

    %% CROSS-DATABASE REFERENCES (String only, no FK)
    Company -.->|companyId| Category
    Company -.->|companyId| Brand
    Company -.->|companyId| Product
    Company -.->|companyId| Warehouse
    Company -.->|companyId| Supplier
    Company -.->|companyId| Customer
    Company -.->|companyId| Tag

    User -.->|createdById| Product
    User -.->|createdById| Supplier
    User -.->|createdById| Customer
    User -.->|createdById| PO
    User -.->|createdById| Order
    User -.->|createdById| Movement

    %% STYLING
    classDef userTable fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef companyTable fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef productTable fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef inventoryTable fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef purchaseTable fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    classDef salesTable fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class User,Session,LoginHist userTable
    class Company,Member,AuditLog companyTable
    class Category,Brand,Product,Variant,VarAttr,Image,Tag,ProdTag productTable
    class Warehouse,Inventory,Movement inventoryTable
    class Supplier,ProdSupp,PO,POItem purchaseTable
    class Customer,Order,OrderItem salesTable
```

---

## DETAILED RELATIONSHIP MAP

### 🔐 **SUPABASE DATABASE**

#### User Relationships:

```
User (1) ──────> (N) UserSession
User (1) ──────> (N) LoginHistory
User (1) ──────> (N) Company [as creator]
User (N) ←────> (N) Company [via CompanyMember]
```

#### Company Relationships:

```
Company (N) ←──> (N) User [via CompanyMember]
Company (1) -.──> (N) [ALL NEON TABLES] [via string companyId]
```

---

### 🗄️ **NEON DATABASE**

#### Product Catalog:

```
Category (1) ──────> (N) Category [parent-child tree]
Category (1) ──────> (N) Product

Brand (1) ──────> (N) Product

Product (1) ──────> (N) ProductVariant
Product (1) ──────> (N) ProductImage
Product (N) ←──────> (N) Tag [via ProductTag]
Product (1) ──────> (N) InventoryItem
Product (N) ←──────> (N) Supplier [via ProductSupplier]

ProductVariant (1) ──> (N) VariantAttribute
ProductVariant (1) ──> (N) InventoryItem
```

#### Warehouse & Inventory:

```
Warehouse (1) ──────> (N) InventoryItem

InventoryItem relationships:
  - Product (1) ──> (N) InventoryItem
  - ProductVariant (1) ──> (N) InventoryItem [optional]
  - Warehouse (1) ──> (N) InventoryItem
  - InventoryItem (1) ──> (N) InventoryMovement
```

#### Purchasing:

```
Supplier (1) ──────> (N) PurchaseOrder
Supplier (N) ←──────> (N) Product [via ProductSupplier]

PurchaseOrder (1) ──> (N) PurchaseOrderItem

PurchaseOrderItem relationships:
  - Product (1) ──> (N) PurchaseOrderItem
  - ProductVariant (1) ──> (N) PurchaseOrderItem [optional]
```

#### Sales:

```
Customer (1) ──────> (N) Order

Order (1) ──────> (N) OrderItem

OrderItem relationships:
  - Product (1) ──> (N) OrderItem
  - ProductVariant (1) ──> (N) OrderItem [optional]
```

---

## CROSS-DATABASE RELATIONSHIPS

### String References (No FK Constraints):

```
SUPABASE.Company.id (UUID)
    └──> NEON.Category.companyId (String)
    └──> NEON.Brand.companyId (String)
    └──> NEON.Product.companyId (String)
    └──> NEON.Warehouse.companyId (String)
    └──> NEON.Supplier.companyId (String)
    └──> NEON.Customer.companyId (String)
    └──> NEON.PurchaseOrder.companyId (String)
    └──> NEON.Order.companyId (String)
    └──> NEON.Tag.companyId (String)

SUPABASE.User.id (UUID)
    └──> NEON.Product.createdById (String)
    └──> NEON.Supplier.createdById (String)
    └──> NEON.Customer.createdById (String)
    └──> NEON.PurchaseOrder.createdById (String)
    └──> NEON.Order.createdById (String)
    └──> NEON.InventoryMovement.createdById (String)
```

**NOTE:** These are string references only. Application-level validation required.

---

## CARDINALITY LEGEND

| Symbol       | Meaning                                  |
| ------------ | ---------------------------------------- |
| `─────>`     | One-to-Many (solid line = FK constraint) |
| `←────>`     | Many-to-Many (via junction table)        |
| `-.───>`     | Cross-database string reference (no FK)  |
| `(1)`        | One side                                 |
| `(N)`        | Many side                                |
| `[optional]` | Nullable foreign key                     |

---

## CASCADE BEHAVIORS

### OnDelete Behaviors:

**CASCADE:**

- User → UserSession (delete sessions when user deleted)
- Company → CompanyMember (remove memberships)
- Product → ProductVariant (delete variants)
- Product → ProductImage (delete images)
- Product → InventoryItem (delete inventory)
- Order → OrderItem (delete line items)
- PurchaseOrder → PurchaseOrderItem (delete line items)

**SET NULL:**

- Category → Product.categoryId
- Brand → Product.brandId

**RESTRICT:**

- Category parent → children (prevent delete if has children)
- Supplier → PurchaseOrder (can't delete supplier with orders)
- Customer → Order (can't delete customer with orders)
- Product → OrderItem (can't delete product in orders)

---

## KEY IMPROVEMENTS

✅ **Proper FK Relations:** Product → Category/Brand work!
✅ **No Orphaned Fields:** Every FK has a proper @relation
✅ **Junction Tables:** Many-to-many properly normalized
✅ **Company Scoping:** All business data includes companyId
✅ **Audit Trail:** createdById on all major tables
✅ **Clean Hierarchy:** Clear separation of concerns

---

## QUERY EXAMPLES

### Get Product with All Relations:

```typescript
const product = await neonClient.product.findUnique({
  where: { id: productId },
  include: {
    category: true, // ✅ Works!
    brand: true, // ✅ Works!
    variants: {
      include: {
        attributes: true,
      },
    },
    images: true,
    tags: {
      include: {
        tag: true,
      },
    },
    inventoryItems: {
      include: {
        warehouse: true,
      },
    },
  },
});
```

### Get Company with All Business Data:

```typescript
// 1. Get company from Supabase
const company = await supabaseClient.company.findUnique({
  where: { id: companyId },
});

// 2. Get business data from Neon
const products = await neonClient.product.findMany({
  where: { companyId: company.id },
});

const warehouses = await neonClient.warehouse.findMany({
  where: { companyId: company.id },
});
```

---

**This diagram shows the PROPER schema - ready to implement!**
