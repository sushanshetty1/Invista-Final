# Multi-Location Management System

## Overview

The Invista system now supports proper multi-location management where companies can have multiple warehouses, retail outlets, offices, and other types of locations. Users belong to the company first and are then assigned to specific locations with appropriate access levels.

## Key Features

### 1. Hierarchical Structure
```
Company
├── Locations (Warehouses, Retail Outlets, Offices, etc.)
│   ├── Users (Primary Location Assignment)
│   └── Location Access Permissions
└── Users (Company-wide, then location-specific assignments)
```

### 2. Location Types

#### Warehouse & Distribution
- **WAREHOUSE** - Standard warehouse facility
- **DISTRIBUTION_CENTER** - Distribution hub
- **FULFILLMENT_CENTER** - E-commerce fulfillment
- **CROSS_DOCK** - Transfer facility
- **COLD_STORAGE** - Temperature-controlled storage

#### Retail Locations
- **RETAIL_STORE** - Physical retail location
- **FLAGSHIP_STORE** - Main retail showcase
- **OUTLET_STORE** - Discount retail location
- **POP_UP_STORE** - Temporary retail location
- **KIOSK** - Small retail point
- **SHOWROOM** - Display and demo center

#### Corporate Locations
- **HEADQUARTERS** - Main company office
- **OFFICE** - Branch office
- **FACTORY** - Manufacturing facility
- **REMOTE** - Remote work location
- **OTHER** - Other type of location

### 3. User Assignment Logic

#### Step 1: Company Membership
Users are first added to the company through the existing `CompanyUser` model with roles like:
- **OWNER** - Company owner
- **ADMIN** - Company administrator
- **MANAGER** - Department/location manager
- **SUPERVISOR** - Supervisor role
- **EMPLOYEE** - Standard employee

#### Step 2: Primary Location Assignment
Each user can have a primary work location set via:
```typescript
// Set primary location
PUT /api/companies/{companyId}/users/{userId}/primary-location
{
  "locationId": "location-uuid"
}
```

#### Step 3: Additional Location Access
Users can be granted access to multiple locations with different permission levels:
```typescript
// Grant location access
POST /api/companies/{companyId}/users/{userId}/location-access
{
  "locationId": "location-uuid",
  "accessLevel": "STANDARD", // READ_ONLY, STANDARD, SUPERVISOR, MANAGER, ADMIN
  "canManage": false,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31" // optional
}
```

### 4. Access Levels

- **READ_ONLY** - Can view location data
- **STANDARD** - Can perform standard operations
- **SUPERVISOR** - Can supervise operations  
- **MANAGER** - Can manage location settings
- **ADMIN** - Full administrative access

## Database Schema Changes

### Enhanced CompanyLocation Model
```prisma
model CompanyLocation {
  id            String       @id @default(uuid())
  companyId     String
  name          String
  description   String?
  code          String?      // Unique identifier
  type          LocationType @default(OFFICE)
  
  // Physical Address
  address       Json         // {street, city, state, country, zip}
  coordinates   Json?        // {lat, lng}
  timezone      String       @default("UTC")
  
  // Contact Information
  phone         String?
  email         String?
  managerName   String?
  managerUserId String?
  
  // Business Configuration
  businessHours Json?        // Operating hours
  isPrimary     Boolean      @default(false)
  isActive      Boolean      @default(true)
  
  // Capabilities
  capacity      Json?        // {volume, weight, pallets, floor_space}
  features      Json?        // {rfid, barcode, temperature_control}
  
  // Retail Specific
  storeFormat   String?      // "flagship", "outlet", "pop-up"
  salesChannels Json?        // ["walk-in", "online", "phone"]
  
  // Operational Settings
  allowsInventory    Boolean @default(true)
  allowsOrders       Boolean @default(true)
  allowsReturns      Boolean @default(true)
  allowsTransfers    Boolean @default(true)
  
  // Relations
  company       Company      @relation(fields: [companyId], references: [id])
  primaryUsers  CompanyUser[] @relation("PrimaryLocation")
  userAccess    UserLocationAccess[]
}
```

### Updated CompanyUser Model
```prisma
model CompanyUser {
  id               String           @id @default(uuid())
  companyId        String
  userId           String
  role             CompanyRole      @default(EMPLOYEE)
  
  // Location Assignment
  primaryLocationId String?         // Primary work location
  allowedLocationIds Json?          // Array of accessible location IDs
  
  // Relations
  primaryLocation  CompanyLocation? @relation("PrimaryLocation", fields: [primaryLocationId], references: [id])
  locationAccess   UserLocationAccess[]
  
  // ... other existing fields
}
```

### New UserLocationAccess Model
```prisma
model UserLocationAccess {
  id          String   @id @default(uuid())
  userId      String
  companyId   String
  locationId  String
  accessLevel LocationAccessLevel @default(READ_ONLY)
  canManage   Boolean  @default(false)
  startDate   DateTime @default(now())
  endDate     DateTime?
  isActive    Boolean  @default(true)
  grantedBy   String?
  grantedAt   DateTime @default(now())
  
  // Relations
  companyUser CompanyUser     @relation(fields: [userId], references: [id])
  location    CompanyLocation @relation(fields: [locationId], references: [id])
}
```

### Enhanced Warehouse Model (Neon DB)
```prisma
model Warehouse {
  id String @id @default(uuid())
  
  // Company & Location Reference
  companyId String
  locationId String? // Links to CompanyLocation in Supabase
  
  // Warehouse specific configuration
  type     WarehouseType @default(STANDARD)
  capacity Json? // {volume, weight, pallets}
  
  // Operational Capabilities
  allowsReceiving    Boolean @default(true)
  allowsShipping     Boolean @default(true)
  allowsTransfers    Boolean @default(true)
  allowsCrossDock    Boolean @default(false)
  
  // ... other warehouse-specific fields
}
```

## API Endpoints

### Location Management
```typescript
// Get all company locations
GET /api/companies/{companyId}/locations

// Create new location
POST /api/companies/{companyId}/locations

// Get specific location
GET /api/companies/{companyId}/locations/{locationId}

// Update location
PUT /api/companies/{companyId}/locations/{locationId}

// Delete location (soft delete)
DELETE /api/companies/{companyId}/locations/{locationId}
```

### User Location Assignment
```typescript
// Get user's location access
GET /api/companies/{companyId}/users/{userId}/location-access

// Grant location access
POST /api/companies/{companyId}/users/{userId}/location-access

// Revoke location access
DELETE /api/companies/{companyId}/users/{userId}/location-access?locationId={locationId}

// Set primary location
PUT /api/companies/{companyId}/users/{userId}/primary-location

// Get primary location
GET /api/companies/{companyId}/users/{userId}/primary-location
```

## Frontend Components

### LocationManager Component
- **File**: `/components/company/LocationManager.tsx`
- **Purpose**: Manage all company locations
- **Features**:
  - View all locations in a grid layout
  - Create new locations with detailed configuration
  - Edit existing locations
  - Support for different location types
  - Warehouse integration for inventory-enabled locations

### UserLocationAssignment Component
- **File**: `/components/company/UserLocationAssignment.tsx`
- **Purpose**: Manage user location assignments
- **Features**:
  - Assign primary locations to users
  - Grant/revoke location access permissions
  - Set access levels and management permissions
  - Search and filter users
  - View location access overview

## Implementation Workflow

### 1. Setup Locations
1. Create company locations using the LocationManager component
2. Configure location types, addresses, and operational capabilities
3. Set up warehouse records for inventory-enabled locations

### 2. Assign Users
1. Users are added to the company (existing functionality)
2. Assign primary work location to each user
3. Grant additional location access as needed
4. Set appropriate access levels and permissions

### 3. Operations
1. Users can only access locations they're assigned to
2. Inventory operations are restricted by location access
3. Managers can oversee their assigned locations
4. Admins have company-wide access

## Migration Strategy

### For Existing Implementations:
1. **Create CompanyLocation records** for existing warehouses
2. **Migrate warehouse data** to use location references
3. **Assign users** to their primary locations
4. **Set up access permissions** based on current roles
5. **Update frontend components** to use new location system

### Database Migration Steps:
```sql
-- 1. Add new fields to existing tables
ALTER TABLE company_users ADD COLUMN primary_location_id UUID;
ALTER TABLE warehouses ADD COLUMN location_id UUID;

-- 2. Create UserLocationAccess table
-- (This will be handled by Prisma migration)

-- 3. Migrate existing data
-- Create CompanyLocation records for existing warehouses
-- Assign users to appropriate locations
-- Set up default access permissions
```

## Benefits

### 1. **Scalability**
- Support for unlimited locations per company
- Flexible location types for different business models
- Easy addition of new location types

### 2. **Security**
- Granular access control per location
- Time-limited access permissions
- Role-based location management

### 3. **Operational Efficiency**
- Clear assignment of responsibilities
- Location-specific inventory management
- Streamlined user onboarding process

### 4. **Flexibility**
- Users can work across multiple locations
- Different access levels for different needs
- Support for complex organizational structures

## Next Steps

1. **Implement database migrations** to update schema
2. **Deploy API endpoints** for location and user management
3. **Integrate frontend components** into admin dashboard
4. **Set up automated user provisioning** for new locations
5. **Create reporting dashboards** for location analytics
6. **Implement location-based inventory filtering** throughout the system

This multi-location system provides a robust foundation for companies with complex operational structures while maintaining the flexibility to scale and adapt to different business needs.
