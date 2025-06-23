import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient, neonClient } from '@/lib/db';

// GET /api/companies/[companyId]/locations - Get all locations for a company
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;    // Get locations from Supabase
    const locations = await supabaseClient.companyLocation.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' },
      ],
    });

    // For warehouse/retail locations, get additional data from Neon
    const warehouseData = await Promise.all(
      locations
        .filter(loc => ['WAREHOUSE', 'DISTRIBUTION_CENTER', 'RETAIL_STORE', 'FULFILLMENT_CENTER'].includes(loc.type))
        .map(async (location) => {
          try {            const warehouse = await neonClient.warehouse.findFirst({
              where: {
                companyId,
                OR: [
                  { name: location.name },
                  { code: (location as any).code || `LOC-${location.id.slice(-8)}` },
                ],
              },
            });
            return { locationId: location.id, warehouse };
          } catch (error) {
            console.warn(`Could not fetch warehouse data for location ${location.id}:`, error);
            return { locationId: location.id, warehouse: null };
          }
        })
    );

    // Merge location data with warehouse data
    const enrichedLocations = locations.map(location => {
      const warehouseInfo = warehouseData.find(w => w.locationId === location.id);
      return {
        ...location,
        warehouse: warehouseInfo?.warehouse || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedLocations,
    });
  } catch (error) {
    console.error('Error fetching company locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company locations' },
      { status: 500 }
    );
  }
}

// POST /api/companies/[companyId]/locations - Create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;
    const body = await request.json();

    const {
      name,
      description,
      code,
      type,
      address,
      coordinates,
      timezone = 'UTC',
      phone,
      email,
      managerName,
      managerUserId,
      businessHours,
      capacity,
      features,
      storeFormat,
      salesChannels,
      allowsInventory = true,
      allowsOrders = true,
      allowsReturns = true,
      allowsTransfers = true,
      isPrimary = false,
      // Warehouse specific data
      warehouseConfig,
    } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }    // Create location in Supabase
    const location = await supabaseClient.companyLocation.create({
      data: {
        companyId,
        name,
        description,
        code,
        type,
        address,
        coordinates,
        timezone,
        phone,
        email,
        managerName,
        managerUserId,
        businessHours,
        capacity,
        features,
        storeFormat,
        salesChannels,
        allowsInventory,
        allowsOrders,
        allowsReturns,
        allowsTransfers,
        isPrimary,
      } as any, // Type assertion due to generated types not being up to date
    });

    // If it's a warehouse/retail location that needs inventory management, create warehouse in Neon
    if (['WAREHOUSE', 'DISTRIBUTION_CENTER', 'RETAIL_STORE', 'FULFILLMENT_CENTER'].includes(type) && allowsInventory) {
      try {
        await neonClient.warehouse.create({
          data: {
            companyId,
            locationId: location.id,
            name,
            code: code || `WH-${location.id.slice(-8)}`,
            description,
            address,
            coordinates,
            timezone,
            managerName,
            managerEmail: email,
            phone,
            email,
            type: type === 'RETAIL_STORE' ? 'RETAIL_STORE' : 'STANDARD',
            capacity,
            isActive: true,
            ...warehouseConfig,
          },
        });
      } catch (error) {
        console.warn('Failed to create warehouse record:', error);
        // Don't fail the entire operation if warehouse creation fails
      }
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error creating company location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create company location' },
      { status: 500 }
    );
  }
}
