
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

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  emailVerified: 'emailVerified',
  firstName: 'firstName',
  lastName: 'lastName',
  displayName: 'displayName',
  avatar: 'avatar',
  phone: 'phone',
  passwordHash: 'passwordHash',
  twoFactorEnabled: 'twoFactorEnabled',
  twoFactorSecret: 'twoFactorSecret',
  isActive: 'isActive',
  isSuspended: 'isSuspended',
  suspendedReason: 'suspendedReason',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  displayName: 'displayName',
  description: 'description',
  email: 'email',
  phone: 'phone',
  website: 'website',
  address1: 'address1',
  address2: 'address2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  country: 'country',
  industry: 'industry',
  taxId: 'taxId',
  registrationNumber: 'registrationNumber',
  businessType: 'businessType',
  logo: 'logo',
  primaryColor: 'primaryColor',
  plan: 'plan',
  planStatus: 'planStatus',
  trialEndsAt: 'trialEndsAt',
  maxUsers: 'maxUsers',
  maxProducts: 'maxProducts',
  maxWarehouses: 'maxWarehouses',
  isActive: 'isActive',
  isSuspended: 'isSuspended',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.CompanyMemberScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  userId: 'userId',
  role: 'role',
  title: 'title',
  departmentId: 'departmentId',
  isActive: 'isActive',
  isOwner: 'isOwner',
  canInvite: 'canInvite',
  joinedAt: 'joinedAt',
  invitedAt: 'invitedAt',
  invitedById: 'invitedById'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  refreshToken: 'refreshToken',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  deviceType: 'deviceType',
  browser: 'browser',
  lastActivity: 'lastActivity',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  isRevoked: 'isRevoked',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt'
};

exports.Prisma.LoginHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  successful: 'successful',
  failReason: 'failReason',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  location: 'location',
  attemptedAt: 'attemptedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  userId: 'userId',
  userEmail: 'userEmail',
  action: 'action',
  resource: 'resource',
  resourceId: 'resourceId',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  severity: 'severity',
  timestamp: 'timestamp'
};

exports.Prisma.CompanyInviteScalarFieldEnum = {
  id: 'id',
  email: 'email',
  companyName: 'companyName',
  invitedByUserId: 'invitedByUserId',
  role: 'role',
  message: 'message',
  token: 'token',
  expiresAt: 'expiresAt',
  status: 'status',
  acceptedAt: 'acceptedAt',
  createdCompanyId: 'createdCompanyId',
  createdAt: 'createdAt'
};

exports.Prisma.CompanyLocationScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  name: 'name',
  code: 'code',
  type: 'type',
  isPrimary: 'isPrimary',
  address1: 'address1',
  address2: 'address2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  country: 'country',
  latitude: 'latitude',
  longitude: 'longitude',
  phone: 'phone',
  email: 'email',
  managerUserId: 'managerUserId',
  isActive: 'isActive',
  openedDate: 'openedDate',
  closedDate: 'closedDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanyIntegrationScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  provider: 'provider',
  providerName: 'providerName',
  config: 'config',
  webhookUrl: 'webhookUrl',
  webhookSecret: 'webhookSecret',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  tokenExpiresAt: 'tokenExpiresAt',
  status: 'status',
  isActive: 'isActive',
  lastSyncAt: 'lastSyncAt',
  lastError: 'lastError',
  syncEnabled: 'syncEnabled',
  syncFrequency: 'syncFrequency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById'
};

exports.Prisma.UserInvitationScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  role: 'role',
  title: 'title',
  token: 'token',
  expiresAt: 'expiresAt',
  status: 'status',
  acceptedAt: 'acceptedAt',
  userId: 'userId',
  createdAt: 'createdAt',
  invitedById: 'invitedById'
};

exports.Prisma.UserPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  theme: 'theme',
  language: 'language',
  timezone: 'timezone',
  dateFormat: 'dateFormat',
  emailNotifications: 'emailNotifications',
  pushNotifications: 'pushNotifications',
  smsNotifications: 'smsNotifications',
  notifyLowStock: 'notifyLowStock',
  notifyOrderShipped: 'notifyOrderShipped',
  notifyNewOrder: 'notifyNewOrder',
  notifySystemUpdates: 'notifySystemUpdates',
  sidebarCollapsed: 'sidebarCollapsed',
  defaultDashboard: 'defaultDashboard',
  itemsPerPage: 'itemsPerPage',
  customSettings: 'customSettings',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserNotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  companyId: 'companyId',
  type: 'type',
  title: 'title',
  message: 'message',
  icon: 'icon',
  color: 'color',
  actionUrl: 'actionUrl',
  actionText: 'actionText',
  priority: 'priority',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  isRead: 'isRead',
  readAt: 'readAt',
  isDismissed: 'isDismissed',
  dismissedAt: 'dismissedAt',
  sentAt: 'sentAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.BillingHistoryScalarFieldEnum = {
  id: 'id',
  companyId: 'companyId',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  amount: 'amount',
  currency: 'currency',
  plan: 'plan',
  billingCycle: 'billingCycle',
  status: 'status',
  paymentMethod: 'paymentMethod',
  transactionId: 'transactionId',
  invoiceUrl: 'invoiceUrl',
  receiptUrl: 'receiptUrl',
  dueDate: 'dueDate',
  paidAt: 'paidAt',
  failureReason: 'failureReason',
  retryCount: 'retryCount',
  nextRetryAt: 'nextRetryAt',
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

exports.Prisma.JsonNullValueInput = {
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
exports.BusinessType = exports.$Enums.BusinessType = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
  NONPROFIT: 'NONPROFIT',
  GOVERNMENT: 'GOVERNMENT',
  PARTNERSHIP: 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP: 'SOLE_PROPRIETORSHIP'
};

exports.SubscriptionPlan = exports.$Enums.SubscriptionPlan = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
  CUSTOM: 'CUSTOM'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED'
};

exports.CompanyRole = exports.$Enums.CompanyRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  EMPLOYEE: 'EMPLOYEE',
  CONTRACTOR: 'CONTRACTOR',
  VIEWER: 'VIEWER'
};

exports.AuditSeverity = exports.$Enums.AuditSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

exports.InviteStatus = exports.$Enums.InviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.LocationType = exports.$Enums.LocationType = {
  HEAD_OFFICE: 'HEAD_OFFICE',
  BRANCH_OFFICE: 'BRANCH_OFFICE',
  WAREHOUSE: 'WAREHOUSE',
  RETAIL_STORE: 'RETAIL_STORE',
  DISTRIBUTION_CENTER: 'DISTRIBUTION_CENTER',
  FACTORY: 'FACTORY',
  REMOTE: 'REMOTE'
};

exports.IntegrationStatus = exports.$Enums.IntegrationStatus = {
  PENDING: 'PENDING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
  DISCONNECTED: 'DISCONNECTED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  SYSTEM: 'SYSTEM',
  ORDER: 'ORDER',
  INVENTORY: 'INVENTORY',
  PAYMENT: 'PAYMENT'
};

exports.NotificationPriority = exports.$Enums.NotificationPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.BillingCycle = exports.$Enums.BillingCycle = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  ONE_TIME: 'ONE_TIME'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Company: 'Company',
  CompanyMember: 'CompanyMember',
  UserSession: 'UserSession',
  LoginHistory: 'LoginHistory',
  AuditLog: 'AuditLog',
  CompanyInvite: 'CompanyInvite',
  CompanyLocation: 'CompanyLocation',
  CompanyIntegration: 'CompanyIntegration',
  UserInvitation: 'UserInvitation',
  UserPreference: 'UserPreference',
  UserNotification: 'UserNotification',
  BillingHistory: 'BillingHistory'
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
