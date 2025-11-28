
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  name: 'name',
  slug: 'slug',
  description: 'description',
  parentId: 'parentId',
  displayOrder: 'displayOrder',
  icon: 'icon',
  color: 'color',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BrandScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  name: 'name',
  slug: 'slug',
  description: 'description',
  logo: 'logo',
  website: 'website',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  categoryId: 'categoryId',
  brandId: 'brandId',
  name: 'name',
  sku: 'sku',
  barcode: 'barcode',
  description: 'description',
  lengthCm: 'lengthCm',
  widthCm: 'widthCm',
  heightCm: 'heightCm',
  weightKg: 'weightKg',
  costPrice: 'costPrice',
  sellingPrice: 'sellingPrice',
  wholesalePrice: 'wholesalePrice',
  minStock: 'minStock',
  reorderPoint: 'reorderPoint',
  status: 'status',
  isTrackable: 'isTrackable',
  isSerialized: 'isSerialized',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  name: 'name',
  sku: 'sku',
  barcode: 'barcode',
  costPrice: 'costPrice',
  sellingPrice: 'sellingPrice',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VariantAttributeScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  name: 'name',
  value: 'value'
};

exports.Prisma.ProductImageScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  url: 'url',
  altText: 'altText',
  order: 'order',
  isPrimary: 'isPrimary'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  name: 'name',
  slug: 'slug'
};

exports.Prisma.ProductTagScalarFieldEnum = {
  productId: 'productId',
  tagId: 'tagId'
};

exports.Prisma.WarehouseScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  name: 'name',
  code: 'code',
  description: 'description',
  address1: 'address1',
  address2: 'address2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  country: 'country',
  latitude: 'latitude',
  longitude: 'longitude',
  type: 'type',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryItemScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  variantId: 'variantId',
  warehouseId: 'warehouseId',
  zone: 'zone',
  aisle: 'aisle',
  shelf: 'shelf',
  bin: 'bin',
  quantity: 'quantity',
  reservedQuantity: 'reservedQuantity',
  lotNumber: 'lotNumber',
  batchNumber: 'batchNumber',
  expiryDate: 'expiryDate',
  serialNumbers: 'serialNumbers',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryMovementScalarFieldEnum = {
  id: 'id',
  inventoryItemId: 'inventoryItemId',
  type: 'type',
  quantity: 'quantity',
  quantityBefore: 'quantityBefore',
  quantityAfter: 'quantityAfter',
  reason: 'reason',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  notes: 'notes',
  occurredAt: 'occurredAt',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  name: 'name',
  code: 'code',
  email: 'email',
  phone: 'phone',
  website: 'website',
  address1: 'address1',
  address2: 'address2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  country: 'country',
  taxId: 'taxId',
  paymentTerms: 'paymentTerms',
  currency: 'currency',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.ProductSupplierScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  supplierId: 'supplierId',
  supplierSku: 'supplierSku',
  unitCost: 'unitCost',
  leadTimeDays: 'leadTimeDays',
  isPreferred: 'isPreferred'
};

exports.Prisma.PurchaseOrderScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  orderNumber: 'orderNumber',
  supplierId: 'supplierId',
  subtotal: 'subtotal',
  taxAmount: 'taxAmount',
  shippingCost: 'shippingCost',
  totalAmount: 'totalAmount',
  status: 'status',
  orderDate: 'orderDate',
  expectedDate: 'expectedDate',
  receivedDate: 'receivedDate',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.PurchaseOrderItemScalarFieldEnum = {
  id: 'id',
  purchaseOrderId: 'purchaseOrderId',
  productId: 'productId',
  variantId: 'variantId',
  orderedQty: 'orderedQty',
  receivedQty: 'receivedQty',
  unitCost: 'unitCost',
  totalCost: 'totalCost',
  notes: 'notes'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  customerNumber: 'customerNumber',
  type: 'type',
  firstName: 'firstName',
  lastName: 'lastName',
  businessName: 'businessName',
  email: 'email',
  phone: 'phone',
  billingAddress1: 'billingAddress1',
  billingAddress2: 'billingAddress2',
  billingCity: 'billingCity',
  billingState: 'billingState',
  billingPostalCode: 'billingPostalCode',
  billingCountry: 'billingCountry',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  orderNumber: 'orderNumber',
  customerId: 'customerId',
  warehouseId: 'warehouseId',
  subtotal: 'subtotal',
  taxAmount: 'taxAmount',
  shippingCost: 'shippingCost',
  discountAmount: 'discountAmount',
  totalAmount: 'totalAmount',
  status: 'status',
  paymentStatus: 'paymentStatus',
  orderDate: 'orderDate',
  shippedDate: 'shippedDate',
  deliveredDate: 'deliveredDate',
  shippingAddress: 'shippingAddress',
  trackingNumber: 'trackingNumber',
  carrier: 'carrier',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  variantId: 'variantId',
  orderedQty: 'orderedQty',
  shippedQty: 'shippedQty',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice',
  notes: 'notes'
};

exports.Prisma.StockReservationScalarFieldEnum = {
  id: 'id',
  inventoryItemId: 'inventoryItemId',
  productId: 'productId',
  warehouseId: 'warehouseId',
  quantity: 'quantity',
  reservedFor: 'reservedFor',
  referenceId: 'referenceId',
  status: 'status',
  expiresAt: 'expiresAt',
  reason: 'reason',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById',
  releasedAt: 'releasedAt',
  releasedById: 'releasedById'
};

exports.Prisma.InventoryAuditScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  warehouseId: 'warehouseId',
  auditNumber: 'auditNumber',
  auditType: 'auditType',
  method: 'method',
  plannedDate: 'plannedDate',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  status: 'status',
  itemsPlanned: 'itemsPlanned',
  itemsCounted: 'itemsCounted',
  discrepancies: 'discrepancies',
  notes: 'notes',
  createdAt: 'createdAt',
  createdById: 'createdById',
  conductedBy: 'conductedBy',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt'
};

exports.Prisma.InventoryAuditItemScalarFieldEnum = {
  id: 'id',
  auditId: 'auditId',
  inventoryItemId: 'inventoryItemId',
  productId: 'productId',
  warehouseId: 'warehouseId',
  expectedQuantity: 'expectedQuantity',
  countedQuantity: 'countedQuantity',
  variance: 'variance',
  status: 'status',
  requiresInvestigation: 'requiresInvestigation',
  lotNumber: 'lotNumber',
  notes: 'notes',
  discrepancyReason: 'discrepancyReason',
  countedAt: 'countedAt',
  countedById: 'countedById',
  verifiedAt: 'verifiedAt',
  verifiedById: 'verifiedById',
  adjustedAt: 'adjustedAt',
  adjustedById: 'adjustedById'
};

exports.Prisma.ProductReviewScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  companyId: 'companyId',
  rating: 'rating',
  title: 'title',
  review: 'review',
  reviewerName: 'reviewerName',
  reviewerEmail: 'reviewerEmail',
  userId: 'userId',
  customerId: 'customerId',
  isVerifiedPurchase: 'isVerifiedPurchase',
  purchaseDate: 'purchaseDate',
  isApproved: 'isApproved',
  isVisible: 'isVisible',
  isFlagged: 'isFlagged',
  flagReason: 'flagReason',
  helpfulVotes: 'helpfulVotes',
  notHelpfulVotes: 'notHelpfulVotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvedAt: 'approvedAt',
  approvedById: 'approvedById'
};

exports.Prisma.RagDocumentScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  source: 'source',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  chunkIndex: 'chunkIndex',
  content: 'content',
  title: 'title',
  metadata: 'metadata',
  version: 'version',
  isLatest: 'isLatest',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.ProductStatus = exports.$Enums.ProductStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DISCONTINUED: 'DISCONTINUED',
  DRAFT: 'DRAFT'
};

exports.WarehouseType = exports.$Enums.WarehouseType = {
  STANDARD: 'STANDARD',
  DISTRIBUTION_CENTER: 'DISTRIBUTION_CENTER',
  RETAIL_STORE: 'RETAIL_STORE',
  COLD_STORAGE: 'COLD_STORAGE',
  FULFILLMENT_CENTER: 'FULFILLMENT_CENTER'
};

exports.InventoryStatus = exports.$Enums.InventoryStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  QUARANTINE: 'QUARANTINE',
  DAMAGED: 'DAMAGED',
  EXPIRED: 'EXPIRED'
};

exports.MovementType = exports.$Enums.MovementType = {
  RECEIPT: 'RECEIPT',
  SHIPMENT: 'SHIPMENT',
  ADJUSTMENT: 'ADJUSTMENT',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  RETURN: 'RETURN',
  DAMAGE: 'DAMAGE'
};

exports.SupplierStatus = exports.$Enums.SupplierStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.PurchaseOrderStatus = exports.$Enums.PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED'
};

exports.CustomerType = exports.$Enums.CustomerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS'
};

exports.CustomerStatus = exports.$Enums.CustomerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PROSPECT: 'PROSPECT',
  SUSPENDED: 'SUSPENDED'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.ReservationStatus = exports.$Enums.ReservationStatus = {
  ACTIVE: 'ACTIVE',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.AuditType = exports.$Enums.AuditType = {
  CYCLE_COUNT: 'CYCLE_COUNT',
  FULL_COUNT: 'FULL_COUNT',
  SPOT_CHECK: 'SPOT_CHECK',
  YEAR_END: 'YEAR_END',
  INVESTIGATION: 'INVESTIGATION'
};

exports.AuditMethod = exports.$Enums.AuditMethod = {
  MANUAL: 'MANUAL',
  BARCODE: 'BARCODE',
  RFID: 'RFID',
  ABC_ANALYSIS: 'ABC_ANALYSIS'
};

exports.AuditStatus = exports.$Enums.AuditStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.AuditItemStatus = exports.$Enums.AuditItemStatus = {
  PENDING: 'PENDING',
  COUNTED: 'COUNTED',
  VERIFIED: 'VERIFIED',
  ADJUSTED: 'ADJUSTED',
  EXCEPTION: 'EXCEPTION'
};

exports.Prisma.ModelName = {
  Category: 'Category',
  Brand: 'Brand',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  VariantAttribute: 'VariantAttribute',
  ProductImage: 'ProductImage',
  Tag: 'Tag',
  ProductTag: 'ProductTag',
  Warehouse: 'Warehouse',
  InventoryItem: 'InventoryItem',
  InventoryMovement: 'InventoryMovement',
  Supplier: 'Supplier',
  ProductSupplier: 'ProductSupplier',
  PurchaseOrder: 'PurchaseOrder',
  PurchaseOrderItem: 'PurchaseOrderItem',
  Customer: 'Customer',
  Order: 'Order',
  OrderItem: 'OrderItem',
  StockReservation: 'StockReservation',
  InventoryAudit: 'InventoryAudit',
  InventoryAuditItem: 'InventoryAuditItem',
  ProductReview: 'ProductReview',
  RagDocument: 'RagDocument'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
