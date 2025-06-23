# Multi-Location System Implementation Guide

This guide shows how to use the new multi-location functionality in the company profile and user profile pages.

## Company Profile Page

### Location Management Tab

The company profile now includes a dedicated "Locations" tab where administrators can:

1. **Manage Company Locations**
   - View all company locations in a grid layout
   - Create new locations (warehouses, retail stores, offices, etc.)
   - Edit existing location details
   - Configure location capabilities (inventory, orders, returns, transfers)

2. **User Location Assignments**
   - Assign primary work locations to team members
   - Grant additional location access with specific permission levels
   - Manage user access across multiple locations
   - View location access overview

### How to Access
1. Navigate to **Company Profile** page
2. Click on the **"Locations"** tab
3. Use the location management interface to set up your locations
4. Assign users to appropriate locations

### Location Types Supported
- **Warehouses**: Standard, Distribution Centers, Fulfillment Centers, Cold Storage
- **Retail**: Stores, Flagship Stores, Outlets, Pop-ups, Kiosks, Showrooms
- **Corporate**: Headquarters, Offices, Factories, Remote locations

## User Profile Page

### My Locations Tab

Users can now view their location assignments in a dedicated tab:

1. **Primary Work Location**
   - Shows the user's main work location
   - Displays location details and address
   - Clearly marked as "Primary"

2. **Additional Location Access**
   - Lists all locations the user has access to
   - Shows access level (Read Only, Standard, Supervisor, Manager, Admin)
   - Displays management permissions
   - Shows access expiration dates if applicable

3. **Company-Specific View**
   - Organized by company for users in multiple companies
   - Shows role within each company
   - Separate location assignments per company

### How to Access
1. Navigate to **User Profile** page
2. Click on the **"My Locations"** tab
3. View your location assignments and access permissions

## Implementation Benefits

### For Administrators
- **Centralized Management**: Manage all locations from one interface
- **Granular Control**: Set specific access levels for each user-location combination
- **Scalable**: Support for unlimited locations and complex organizational structures
- **Flexible Assignment**: Users can work across multiple locations with different permissions

### For Users
- **Clear Visibility**: See exactly which locations you can access
- **Role-Based Access**: Understand your permissions at each location
- **Multi-Company Support**: Handle location assignments across multiple companies
- **Real-Time Updates**: Location assignments update immediately

## Access Levels Explained

1. **READ_ONLY**: Can view location data only
2. **STANDARD**: Can perform standard operations (most employees)
3. **SUPERVISOR**: Can supervise operations and manage teams
4. **MANAGER**: Can manage location settings and operations
5. **ADMIN**: Full administrative access to the location

## Workflow Example

### Setting Up a New Retail Store

1. **Create Location** (Company Admin)
   - Go to Company Profile → Locations tab
   - Click "Add Location"
   - Select "Retail Store" type
   - Fill in address, contact details, and operational settings
   - Enable inventory, orders, returns, and transfers as needed

2. **Assign Store Manager** (Company Admin)
   - Go to "User Location Assignments" section
   - Find the store manager in the user list
   - Set their primary location to the new store
   - Grant "MANAGER" level access with management permissions

3. **Assign Store Staff** (Company Admin or Store Manager)
   - Assign primary location to store employees
   - Grant "STANDARD" access level for regular operations
   - Grant "SUPERVISOR" access for team leads

4. **User Experience** (Store Employees)
   - Users can view their location assignment in User Profile → My Locations
   - They see their primary work location and access level
   - Location-based inventory and operations are automatically filtered

### Managing Warehouse Operations

1. **Create Warehouse** (Company Admin)
   - Create location with "Warehouse" type
   - Configure capacity, features (RFID, temperature control, etc.)
   - Set up operational capabilities

2. **Assign Warehouse Staff**
   - Warehouse Manager: Primary location + ADMIN access
   - Supervisors: Primary location + SUPERVISOR access
   - Workers: Primary location + STANDARD access
   - Temporary workers: Time-limited access with end dates

3. **Cross-Location Access**
   - Distribution managers can have access to multiple warehouses
   - Different access levels at different locations
   - Flexible permissions based on operational needs

This multi-location system provides the foundation for complex operational structures while maintaining simplicity for smaller organizations.
