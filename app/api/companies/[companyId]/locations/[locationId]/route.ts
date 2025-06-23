import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient, neonClient } from '@/lib/db';

// GET /api/companies/[companyId]/locations/[locationId] - Get specific location
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; locationId: string } }
) {
  try {
    const { companyId, locationId } = params;    const location = await supabaseClient.companyLocation.findFirst({
      where: {
        id: locationId,
        companyId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Get warehouse data if applicable
    let warehouse = null;
    if (['WAREHOUSE', 'DISTRIBUTION_CENTER', 'RETAIL_STORE', 'FULFILLMENT_CENTER'].includes(location.type)) {
      try {        warehouse = await neonClient.warehouse.findFirst({
          where: {
            companyId,
            OR: [
              { name: location.name },
              { code: (location as any).code || `LOC-${location.id.slice(-8)}` },
            ],
          },
        });
      } catch (error) {
        console.warn('Could not fetch warehouse data:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...location,
        warehouse,
      },
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[companyId]/locations/[locationId] - Update location
export async function PUT(
  request: NextRequest,
  { params }: { params: { companyId: string; locationId: string } }
) {
  try {
    const { companyId, locationId } = params;
    const body = await request.json();
    
    const { warehouseConfig, ...locationData } = body;

    // Update location in Supabase
    const location = await supabaseClient.companyLocation.update({
      where: {
        id: locationId,
        companyId,
      },
      data: locationData as any, // Type assertion due to generated types not being up to date
    });

    // Update warehouse data if it exists
    if (warehouseConfig && ['WAREHOUSE', 'DISTRIBUTION_CENTER', 'RETAIL_STORE', 'FULFILLMENT_CENTER'].includes(location.type)) {
      try {        await neonClient.warehouse.updateMany({
          where: {
            companyId,
            OR: [
              { name: location.name },
              { code: (location as any).code },
            ],
          },
          data: warehouseConfig,
        });
      } catch (error) {
        console.warn('Failed to update warehouse data:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[companyId]/locations/[locationId] - Soft delete location
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; locationId: string } }
) {
  try {
    const { companyId, locationId } = params;

    // Check if location has active inventory or operations
    let hasActiveInventory = false;
    try {
      const inventoryCount = await neonClient.inventoryItem.count({
        where: {
          warehouseId: locationId,
          quantity: {
            gt: 0,
          },
        },
      });
      hasActiveInventory = inventoryCount > 0;
    } catch (error) {
      console.warn('Could not check inventory status:', error);
    }

    if (hasActiveInventory) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete location with active inventory. Please transfer or remove inventory first.' 
        },
        { status: 400 }
      );
    }

    // Soft delete location
    const location = await supabaseClient.companyLocation.update({
      where: {
        id: locationId,
        companyId,
      },
      data: {
        isActive: false,
      },
    });

    // Deactivate warehouse if it exists
    try {      await neonClient.warehouse.updateMany({
        where: {
          companyId,
          OR: [
            { name: location.name },
            { code: (location as any).code },
          ],
        },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      console.warn('Failed to deactivate warehouse:', error);
    }

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}
