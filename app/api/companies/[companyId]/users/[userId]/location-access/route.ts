import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/db';

// GET /api/companies/[companyId]/users/[userId]/location-access - Get user's location access
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; userId: string } }
) {
  try {
    const { companyId, userId } = params;

    // Get user's location access
    const userAccess = await supabaseClient.userLocationAccess.findMany({
      where: {
        userId,
        companyId,
        isActive: true,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    });

    // Get user's primary location
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
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        primaryLocation: companyUser?.primaryLocation || null,
        locationAccess: userAccess,
      },
    });
  } catch (error) {
    console.error('Error fetching user location access:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user location access' },
      { status: 500 }
    );
  }
}

// POST /api/companies/[companyId]/users/[userId]/location-access - Grant location access
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string; userId: string } }
) {
  try {
    const { companyId, userId } = params;
    const body = await request.json();
    
    const {
      locationId,
      accessLevel = 'READ_ONLY',
      canManage = false,
      startDate = new Date(),
      endDate,
      grantedBy,
    } = body;

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Check if access already exists
    const existingAccess = await supabaseClient.userLocationAccess.findFirst({
      where: {
        userId,
        companyId,
        locationId,
      },
    });

    if (existingAccess) {
      // Update existing access
      const updatedAccess = await supabaseClient.userLocationAccess.update({
        where: {
          id: existingAccess.id,
        },
        data: {
          accessLevel,
          canManage,
          startDate,
          endDate,
          isActive: true,
          grantedBy,
          grantedAt: new Date(),
        } as any,
      });

      return NextResponse.json({
        success: true,
        data: updatedAccess,
      });
    } else {
      // Create new access
      const newAccess = await supabaseClient.userLocationAccess.create({
        data: {
          userId,
          companyId,
          locationId,
          accessLevel,
          canManage,
          startDate,
          endDate,
          grantedBy,
        } as any,
      });

      return NextResponse.json({
        success: true,
        data: newAccess,
      });
    }
  } catch (error) {
    console.error('Error granting location access:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to grant location access' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[companyId]/users/[userId]/location-access/[locationId] - Revoke location access
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; userId: string } }
) {
  try {
    const { companyId, userId } = params;
    const url = new URL(request.url);
    const locationId = url.searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Deactivate access instead of deleting
    const updatedAccess = await supabaseClient.userLocationAccess.updateMany({
      where: {
        userId,
        companyId,
        locationId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: { count: updatedAccess.count },
    });
  } catch (error) {
    console.error('Error revoking location access:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke location access' },
      { status: 500 }
    );
  }
}
