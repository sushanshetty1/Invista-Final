# COMPLETE DATABASE DOCUMENTATION

This document provides a comprehensive overview of all tables in both Supabase and Neon DB, their purposes, usage scenarios, and recommended workflows for a full-featured inventory and business management system.

---

## 🔐 SUPABASE DATABASE - Authentication & Company Management

### Currently Active Tables
- **users**: User authentication and profile
- **companies**: Company profiles and settings
- **company_users**: User-company relationships and roles
- **company_invites**: Invitation system for joining companies
- **login_history**: Authentication audit trail
- **password_resets**: Password recovery

### Should Be Used (Recommended)
- **company_locations**: Multi-location support (warehouses, stores, offices)
- **departments**: Organizational structure
- **user_location_access**: Location-based permissions
- **audit_logs / company_audit_logs**: Activity tracking
- **user_notifications**: In-app notifications
- **billing_history**: Subscription and payment tracking
- **user_sessions**: Active session management
- **user_roles / roles**: Global role assignment and definitions
- **user_preferences**: User settings storage
- **user_invitations**: Platform user invites
- **company_integrations**: Third-party integrations
- **system_settings**: Platform configuration
- **api_keys**: API authentication

---

## 🏭 NEON DATABASE - Inventory & Operations

### Currently Active Tables
- **products**: Product catalog
- **brands**: Product brands

### Critical Tables (Must Use with Products)
- **categories**: Product classification (seed from industry categories)
- **warehouses**: Storage locations (create during company setup)
- **inventory_items**: Stock tracking per warehouse
- **inventory_movements**: Audit trail of all inventory changes

### Supplier Management
- **suppliers**: Supplier directory
- **product_suppliers**: Product-supplier links
- **supplier_contacts**: Supplier contact persons
- **supplier_documents**: Supplier documentation

### Purchase Order Workflow
- **purchase_orders**: Purchase orders
- **purchase_order_items**: PO line items
- **goods_receipts**: Receiving documents
- **goods_receipt_items**: Received items detail

### Customer & Sales Tables
- **customers**: Customer directory
- **customer_contacts**: Customer contacts
- **orders**: Sales orders
- **order_items**: Order line items
- **stock_reservations**: Inventory holds

### Shipping & Fulfillment
- **shipments**: Shipping records
- **shipment_packages**: Package details
- **shipment_tracking**: Tracking updates

### Warehouse Operations
- **stock_transfers**: Inter-warehouse transfers
- **stock_transfer_items**: Transfer line items
- **inventory_audits**: Stock counting
- **inventory_audit_items**: Audit line items

### Advanced Product Features
- **product_variants**: Product variations
- **product_bundles**: Product kits
- **product_reviews**: Customer reviews

### Invoicing & Financials
- **supplier_invoices**: Payables
- **customer_invoices**: Receivables
- **system_configuration**: System settings

---

## 🎯 Product Creation Workflow - Complete Checklist

### When Creating a Product
1. **products** (Neon) - Create product record
2. **warehouses** (Neon) - Ensure at least one warehouse exists
3. **inventory_items** (Neon) - Create inventory record per warehouse
4. **inventory_movements** (Neon) - Log initial setup
5. **categories** (Neon) - Link product to category (recommended)
6. **brands** (Neon) - Link product to brand (recommended)
7. **product_suppliers** (Neon) - Link product to suppliers (recommended)
8. **audit_logs** (Supabase) - Log product creation (recommended)

---

## 📊 Complete Workflows

### Purchase Order → Receive → Stock Flow
1. Create suppliers
2. Create purchase_orders
3. Add purchase_order_items
4. Approve PO
5. Send to supplier
6. Receive goods (goods_receipts, goods_receipt_items)
7. Update inventory (inventory_items, inventory_movements)
8. Create supplier_invoices
9. Process payment

### Sales Order → Fulfill → Ship Flow
1. Create customers
2. Create orders
3. Add order_items
4. Reserve inventory (stock_reservations, inventory_items, inventory_movements)
5. Pick and pack
6. Create shipments
7. Ship order (inventory_items, inventory_movements, stock_reservations, order status, shipment_tracking)
8. Create customer_invoices
9. Record payment

### Stock Transfer Flow
1. Create stock_transfers
2. Add stock_transfer_items
3. Approve transfer
4. Ship from source warehouse (inventory_items, inventory_movements)
5. Receive at destination (inventory_items, inventory_movements, stock_transfer_items)
6. Close transfer

### Inventory Audit Flow
1. Create inventory_audits
2. Add inventory_audit_items
3. Physical count
4. Verify counts
5. Approve adjustments
6. Update inventory (inventory_items, inventory_movements)
7. Complete audit

---

## Implementation Priority
- **Phase 1:** Fix product creation (warehouses, inventory_items, inventory_movements)
- **Phase 2:** Complete inventory system (categories, brands, suppliers, purchase_orders, goods_receipts)
- **Phase 3:** Enable sales (customers, orders, stock_reservations, shipments, customer_invoices)
- **Phase 4:** Advanced features (departments, user_location_access, notifications, integrations, stock_transfers, audits, variants, supplier management)

---

🟢 CAN START IMMEDIATELY (Zero Dependencies)
Supabase - Independent Tables
audit_logs ✅ HIGH PRIORITY

No dependencies
Just needs userId (which you have)
Log all actions (product creation, user login, etc.)
Start logging NOW!
company_audit_logs ✅ HIGH PRIORITY

Needs: companyId (you have this)
Company-scoped audit trail
Start logging NOW!
user_sessions ✅ HIGH PRIORITY

Needs: userId (you have this)
Log every login attempt
Security monitoring
password_resets ✅

Needs: userId (you have this)
Forgot password feature
Independent workflow
user_preferences ✅

Needs: userId (you have this)
Store user settings
Dashboard layouts, display preferences
user_notifications ✅

Needs: userId (you have this)
In-app notifications
Can start building notification system
system_settings ✅

No dependencies
Platform configuration
Feature flags
api_keys ✅

Needs: userId (optional)
API authentication
For integrations
Neon - Independent Tables
categories ✅ CRITICAL - DO THIS FIRST!

No dependencies
Seed from your industry categories
Fix your dropdown issue!
brands ✅ RECOMMENDED

No dependencies
Product brand management
Start collecting brand data
suppliers ✅ IMPORTANT

Needs: companyId (you have this)
Build supplier directory
Foundation for purchase orders
customers ✅ IMPORTANT

Needs: companyId (you have this)
Build customer directory
Foundation for orders
system_configuration ✅

No dependencies
System settings storage

---
🟡 CAN START AFTER MINIMAL SETUP
After Creating company_locations (Supabase)
company_locations

Needs: companyId ✅
Creates foundation for warehouses
Then enables: warehouses, user_location_access
departments

Needs: companyId ✅
Optional: parentId (for hierarchy)
Org structure
After Creating warehouses (Neon)
warehouses
Needs: companyId ✅, locationId (from company_locations)
Foundation for all inventory operations
MUST HAVE for inventory_items


---
🔴 CANNOT START YET (Have Dependencies)
Blocked by Warehouses:
❌ inventory_items - Needs warehouses
❌ inventory_movements - Needs warehouses & inventory_items
❌ inventory_audits - Needs warehouses
❌ purchase_orders - Needs warehouses
❌ orders - Needs warehouses
❌ shipments - Needs warehouses
❌ stock_transfers - Needs warehouses
Blocked by Other Tables:
❌ product_suppliers - Needs suppliers (but can do suppliers now!)
❌ supplier_contacts - Needs suppliers
❌ customer_contacts - Needs customers (but can do customers now!)
❌ product_variants - Needs products ✅ (you can actually do this!)
❌ stock_reservations - Needs inventory_items
❌ user_location_access - Needs company_locations


hellooooooo
