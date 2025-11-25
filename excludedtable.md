🗺️ INVISTA DATABASE SCHEMA - EXCLUDED TABLES REFERENCE
Purpose of This Document
This README explains which tables were intentionally excluded from the MVP (Minimum Viable Product) schema and why. This helps you understand:

What features are NOT in the initial version
Why they were left out
When you should add them back
What alternatives exist in the MVP schema
📊 SUMMARY
Total Tables Excluded: 24 tables

NEON Database: 14 tables
SUPABASE Database: 10 tables
All excluded tables are available in the previous conversation and can be added when needed.

🗄️ NEON DATABASE - EXCLUDED TABLES
Inventory Management (7 tables)
❌ StockTransfer / StockTransferItem
What it does: Move inventory between warehouses with approval workflow

Why excluded:

Can use InventoryMovement with type TRANSFER_OUT and TRANSFER_IN instead
Don't need separate table until you need multi-step approvals (request → approve → ship → receive)
Added complexity for edge case feature
When to add:

Need formal transfer approval workflows
Tracking in-transit inventory between warehouses
Multiple-step transfer process required
MVP Alternative:

// Use InventoryMovement for simple transfers
await neonClient.inventoryMovement.create({
  data: {
    type: 'TRANSFER_OUT',
    inventoryItemId: sourceInventoryId,
    quantity: -10
  }
});
await neonClient.inventoryMovement.create({
  data: {
    type: 'TRANSFER_IN',
    inventoryItemId: destInventoryId,
    quantity: 10
  }
});
❌ GoodsReceipt / GoodsReceiptItem
What it does: Receive shipments from suppliers into warehouse with QC inspection

Why excluded:

Can handle via PurchaseOrder → mark as received → create InventoryMovement
Don't need separate receipt until you need QC inspection, partial receives, or damaged goods tracking
Most businesses just mark PO as received
When to add:

Need quality control inspection process
Track partial receives (receive 50 of 100 ordered)
Track damaged/rejected goods
Compliance requires receipt documentation
MVP Alternative:

// Mark PurchaseOrder as received and update inventory
await neonClient.purchaseOrder.update({
  where: { id: poId },
  data: { status: 'RECEIVED', receivedDate: new Date() }
});
// Create inventory movement for receipt
await neonClient.inventoryMovement.create({
  data: {
    type: 'RECEIPT',
    inventoryItemId,
    quantity: receivedQty,
    referenceType: 'PURCHASE_ORDER',
    referenceId: poId
  }
});
Product Features (3 tables)
❌ ProductBundle / BundleItems / BundleProducts
What it does: Sell product bundles/kits (e.g., "Gaming PC Bundle" with multiple items)

Why excluded:

Original schema was BROKEN - had duplicate tables (BundleItems and BundleProducts were identical!)
Field names were meaningless ("A" and "B" instead of productId/bundleId)
Most businesses sell individual products first, bundles later
Complex pricing and inventory logic
When to add:

Actually selling product bundles/kits
Need to track bundle inventory separately
Bundle pricing requires special handling
MVP Alternative:

Sell items individually
Create bundles on the frontend as "suggested purchases"
Add proper bundle tables when needed (with correct field names!)
Shipping & Logistics (3 tables)
❌ Shipment / ShipmentPackage / ShipmentTracking
What it does: Track packages after they leave warehouse - delivery status, tracking numbers, carrier info

Why excluded:

No users yet = no shipments going out
Order status tracking (PENDING → SHIPPED → DELIVERED) is enough initially
Shipping is usually outsourced to UPS/FedEx/DHL - use their tracking
Complex feature with carrier integrations
When to add:

Shipping 100+ orders per day
Need to track multiple packages per order
Integrating with shipping carriers (UPS, FedEx API)
Need detailed tracking events ("Out for delivery", "In transit", etc.)
MVP Alternative:

Order {
  status: PENDING → PROCESSING → SHIPPED → DELIVERED
  shippedDate: DateTime?
  deliveredDate: DateTime?
  trackingNumber: String?  // Add this field to Order
}
Document Management (3 tables)
❌ SupplierDocument
What it does: Store supplier contracts, insurance certificates, tax forms, quality certificates

Why excluded:

Not core to inventory management
File storage adds complexity (need S3/cloud storage)
Most companies use Google Drive/Dropbox for documents initially
Can track document expiry in separate system
When to add:

Need to track supplier certifications and expiry dates
Compliance requires document storage in your system
Large number of suppliers with many documents
MVP Alternative:

Store PDFs in Google Drive/Dropbox
Keep a spreadsheet of expiry dates
Add to system when document volume becomes unmanageable
❌ SupplierInvoice / CustomerInvoice
What it does: Track invoices (accounts payable/receivable)

Why excluded:

Invoicing ≠ Inventory Management - different business function
PurchaseOrder tracks what you ordered and cost (good enough for inventory)
Order tracks what customer bought and amount (good enough for sales)
Use accounting software instead: QuickBooks, Xero, FreshBooks handle invoicing better
Building invoicing is reinventing the wheel
When to add:

Don't add it - integrate with accounting software instead
Only if building all-in-one business management system
MVP Alternative:

Use Stripe for customer billing
Use QuickBooks/Xero for supplier bills
Keep inventory system focused on inventory
Contact Management (2 tables)
❌ SupplierContact / CustomerContact
What it does: Store multiple contact people for each supplier/customer

Why excluded:

Supplier/Customer tables already have email and phone fields
One contact person is enough to start
Most small businesses only deal with 1-2 people per supplier/customer
When to add:

Large suppliers with different departments (sales, accounting, shipping)
Need to track "who to call for what"
One contact person quits and need backup contacts
MVP Alternative:

Supplier {
  email: "main@supplier.com"
  phone: "+1234567890"
  notes: "Sales: John, Accounting: Mary, Shipping: Bob"
}
☁️ SUPABASE DATABASE - EXCLUDED TABLES
Company Management (4 tables)
❌ Department
What it does: Organize employees into departments (Sales, IT, Warehouse, etc.)

Why excluded:

CompanyMember.role enum (OWNER, ADMIN, MANAGER, EMPLOYEE) is enough for small teams
Small companies don't need formal department structure
Can add departmentId to CompanyMember later
When to add:

Company grows beyond ~20 employees
Need formal department hierarchy
Department-based reporting required
MVP Alternative:

CompanyMember {
  role: OWNER | ADMIN | MANAGER | EMPLOYEE
  title: "Warehouse Manager" // Use title field for department info
}
User Management (6 tables)
❌ UserRole / Role
What it does: Complex custom permission system - create roles with granular permissions

Why excluded:

Original schema had BOTH CompanyMember.role enum AND UserRole table (confusing redundancy!)
Fixed enum with 5 roles (OWNER, ADMIN, MANAGER, EMPLOYEE, VIEWER) is simpler and sufficient
Custom roles add complexity: permissions UI, inheritance, testing
When to add:

Need custom roles beyond the 5 defaults
Need granular permissions ("can edit products but not delete")
Large team with complex permission requirements
MVP Alternative:

enum CompanyRole {
  OWNER      // Full access
  ADMIN      // Almost full access
  MANAGER    // Can manage inventory/orders
  EMPLOYEE   // Can view and edit assigned tasks
  VIEWER     // Read-only access
}
❌ PasswordReset
What it does: Store password reset tokens for "Forgot Password" flow

Why excluded:

Use Supabase Auth or Auth0 instead - they handle password reset securely
Building secure password reset is hard: token generation, expiry, email sending, security
Not core to inventory management
When to add:

Never - use an authentication provider
Only if building custom auth from scratch (not recommended)
MVP Alternative:

Use Supabase Auth's built-in password reset
Use Auth0, Clerk, or similar provider
❌ UserLocationAccess
What it does: Control which warehouses/locations a user can access

Why excluded:

Most companies give users access to ALL locations
Complex permission system
Don't have multiple locations yet
When to add:

Have 10+ warehouses
Need strict location-based access control
Regional managers who only see their region
MVP Alternative:

Give users access to all company data
Control at application level if needed
Advanced Features (3 tables)
❌ SystemSetting / ApiKey
What it does:

SystemSetting: Global app configuration
ApiKey: API key management for external access
Why excluded:

SystemSetting: Put config in environment variables or database view
ApiKey: No API to expose yet, build core features first
When to add:

SystemSetting: When you need admin panel to configure app
ApiKey: When building public API for integrations
MVP Alternative:

Use 
.env
 file for configuration
No API keys needed initially
📋 TABLES THAT WERE ADDED BACK (User Requested)
These were excluded initially but added back per user request:

NEON:
✅ StockReservation - Reserve inventory for orders
✅ InventoryAudit / InventoryAuditItem - Cycle counting
✅ ProductReview - Customer reviews
✅ RagDocument - AI/semantic search
SUPABASE:
✅ CompanyInvite - Invite companies to platform
✅ CompanyLocation - Multiple offices per company
✅ CompanyIntegration - Third-party integrations
✅ UserInvitation - Invite users to company
✅ UserPreference - User settings
✅ UserNotification - In-app notifications
✅ BillingHistory - Subscription payments