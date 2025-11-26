# 🔄 SCHEMA MIGRATION CHEATSHEET

> **Quick reference for OLD → NEW field mappings**
> Use this when fixing TypeScript errors

---

## InventoryItem

```diff
- availableQuantity    → COMPUTED: quantity - reservedQuantity
- averageCost          → REMOVED
- lastCost             → REMOVED  
- unitCost             → REMOVED (use Product.costPrice)
- location             → zone + aisle + shelf + bin
- locationCode         → REMOVED (build from zone/aisle/shelf/bin)
```

## InventoryMovement

```diff
- productId            → ACCESS VIA: inventoryItem.product
- warehouseId          → ACCESS VIA: inventoryItem.warehouse
- product              → ACCESS VIA: inventoryItem.product
- subtype              → REMOVED
- unitCost             → REMOVED
- userId               → createdById
```

## Product

```diff
- primaryImage         → images relation (filter isPrimary: true)
- weight               → weightKg
- dimensions (JSON)    → lengthCm, widthCm, heightCm
- categoryName         → REMOVED (use category.name)
- brandName            → REMOVED (use brand.name)
- suppliers            → supplierProducts relation
```

## Customer

```diff
- companyName          → businessName
- mobile               → phone
- taxId                → REMOVED
- shippingAddress      → REMOVED (on Order now)
```

**CustomerType enum:** Only `INDIVIDUAL` | `BUSINESS`

## Supplier

```diff
- billingAddress (JSON) → address1, address2, city, state, postalCode, country
- products              → productSuppliers relation
- supplierContact       → REMOVED (contact info on Supplier)
```

## Order

```diff
- type                 → REMOVED
- channel              → REMOVED
- priority             → REMOVED
- fulfillmentStatus    → status
- requiredDate         → REMOVED
- promisedDate         → REMOVED
- warehouse            → warehouseId (string, optional)
```

## OrderItem

```diff
- remainingQty         → COMPUTED: orderedQty - shippedQty
```

## StockReservation

```diff
- reservationType      → reservedFor (string)
- referenceType        → REMOVED (use reservedFor)
```

## Model Renames

```diff
- CompanyUser          → CompanyMember
```

---

## ENUM CHANGES

### OrderStatus
```diff
✅ PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED
❌ COMPLETED (use DELIVERED instead)
```

### PaymentStatus
```diff
✅ PENDING, PAID, PARTIALLY_PAID, FAILED, REFUNDED
❌ PROCESSING, CANCELLED
```

### PurchaseOrderStatus
```diff
✅ DRAFT, PENDING, APPROVED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
❌ PENDING_APPROVAL, SENT, ACKNOWLEDGED
```

---

## QUICK FIXES

### Available Quantity
```typescript
// OLD (broken)
const available = item.availableQuantity;

// NEW (fixed)
const available = item.quantity - item.reservedQuantity;
```

### Location
```typescript
// OLD (broken)
location: "A-1-2-3"

// NEW (fixed)
zone: "A", aisle: "1", shelf: "2", bin: "3"
```

### Customer Name
```typescript
// OLD (broken)
customer.companyName

// NEW (fixed)
customer.businessName
```

### Product Suppliers
```typescript
// OLD (broken)
include: { suppliers: true }

// NEW (fixed)
include: { supplierProducts: { include: { supplier: true } } }
```

### Movement Creation
```typescript
// OLD (broken)
{ productId, warehouseId, userId }

// NEW (fixed)  
{ inventoryItemId, createdById }
```

---

## CLIENT IMPORTS

```typescript
// Business data (Products, Orders, Inventory)
import { neonClient } from "@/lib/prisma";

// Auth data (Users, Companies, Sessions)
import { supabaseClient } from "@/lib/prisma";
```

---

## VERIFICATION

```powershell
# Check errors
npx tsc --noEmit

# Count by file
npx tsc --noEmit 2>&1 | findstr "error TS" | ForEach-Object { $_.Split('(')[0] } | Group-Object | Select-Object Name, Count | Sort-Object Count -Descending
```
