import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Optimized query to get company data with user relationship
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        companyUsers:company_users!inner(
          id,
          role,
          isOwner,
          isActive,
          userId
        )
      `)
      .eq('companyUsers.userId', userId)
      .eq('companyUsers.isActive', true)
      .eq('isActive', true)
      .single();

    if (companyError && companyError.code !== 'PGRST116') {
      throw companyError;
    }

    // If no company found via company_users, check if user owns a company
    if (!companyData) {
      const { data: ownedCompany, error: ownedError } = await supabase
        .from('companies')
        .select('*')
        .eq('createdBy', userId)
        .eq('isActive', true)
        .single();

      if (ownedError && ownedError.code !== 'PGRST116') {
        throw ownedError;
      }

      if (ownedCompany) {
        return NextResponse.json({ 
          company: ownedCompany,
          userRole: 'OWNER',
          isOwner: true 
        });
      }

      return NextResponse.json({ error: 'No company found for user' }, { status: 404 });
    }

    const userCompanyData = companyData.companyUsers[0];
    
    return NextResponse.json({
      company: {
        id: companyData.id,
        name: companyData.name,
        displayName: companyData.displayName,
        description: companyData.description,
        website: companyData.website,
        industry: companyData.industry,
        email: companyData.email,
        phone: companyData.phone,
        address: companyData.address,
        logo: companyData.logo,
        size: companyData.size,
        businessType: companyData.businessType,
        registrationNumber: companyData.registrationNumber,
        taxId: companyData.taxId,
        createdAt: companyData.createdAt,
        updatedAt: companyData.updatedAt
      },
      userRole: userCompanyData.role,
      isOwner: userCompanyData.isOwner
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, userId, ...updateData } = body;

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'Company ID and User ID are required' },
        { status: 400 }
      );
    }

    // Verify user has permission to update company
    const { data: userCompany, error: permissionError } = await supabase
      .from('company_users')
      .select('role, isOwner')
      .eq('companyId', companyId)
      .eq('userId', userId)
      .eq('isActive', true)
      .single();

    if (permissionError || !userCompany) {
      // Check if user owns the company
      const { data: ownedCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('createdBy', userId)
        .single();

      if (!ownedCompany) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }
    } else if (!userCompany.isOwner && !['ADMIN', 'MANAGER'].includes(userCompany.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update company
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .eq('id', companyId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ company: updatedCompany });

  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
