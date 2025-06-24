import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/db';

// PUT /api/companies/[companyId]/users/[userId]/primary-location - Set user's primary location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; userId: string }> }
) {
  try {
    const { companyId, userId } = await params;
    const body = await request.json();
    
    const { locationId } = body;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Verify location exists and belongs to the company
    const location = await supabaseClient.companyLocation.findFirst({
      where: {
        id: locationId,
        companyId,
        isActive: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found or inactive' },
        { status: 404 }
      );
    }

    // Update user's primary location
    const updatedUser = await supabaseClient.companyUser.update({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      data: {
        primaryLocationId: locationId,
      } as any,
    });

    // Ensure user has access to their primary location
    const existingAccess = await supabaseClient.userLocationAccess.findFirst({
      where: {
        userId,
        companyId,
        locationId,
      },
    });

    if (!existingAccess) {
      await supabaseClient.userLocationAccess.create({
        data: {
          userId,
          companyId,
          locationId,
          accessLevel: 'STANDARD',
          canManage: false,
        } as any,
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error setting primary location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set primary location' },
      { status: 500 }
    );
  }
}

// GET /api/companies/[companyId]/users/[userId]/primary-location - Get user's primary location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; userId: string }> }
) {
  try {
    const { companyId, userId } = await params;

    const companyUser = await supabaseClient.companyUser.findFirst({
      where: {
        companyId,
        userId,
      },
      select: {
        primaryLocationId: true,
        primaryLocation: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            phone: true,
            email: true,
            managerName: true,
            businessHours: true,
            features: true,
            isActive: true,
          },
        },
      },
    });

    if (!companyUser) {
      return NextResponse.json(
        { success: false, error: 'User not found in company' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        primaryLocationId: companyUser.primaryLocationId,
        primaryLocation: companyUser.primaryLocation,
      },
    });
  } catch (error) {
    console.error('Error fetching primary location:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch primary location' },
      { status: 500 }
    );
  }
}
