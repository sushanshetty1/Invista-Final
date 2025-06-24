import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/companies/[companyId]/locations - Get all locations for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    // Get locations from Supabase
    const { data: locations, error } = await supabase
      .from('company_locations')
      .select('*')
      .eq('companyId', companyId)
      .eq('isActive', true)
      .order('isPrimary', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: locations || [],
    });
  } catch (error) {
    console.error('Error fetching company locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
}

// POST /api/companies/[companyId]/locations - Create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
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
