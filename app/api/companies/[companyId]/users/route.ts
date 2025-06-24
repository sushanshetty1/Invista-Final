import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const companyId = params.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Fetch both active users and pending invites in parallel for better performance
    const [usersResult, invitesResult] = await Promise.all([
      supabase
        .from('company_users')
        .select(`
          id,
          role,
          isActive,
          isOwner,
          joinedAt,
          lastActiveAt,
          title,
          departmentId,
          user:users!inner(
            id,
            email,
            firstName,
            lastName,
            displayName,
            avatar,
            lastLoginAt
          )
        `)
        .eq('companyId', companyId)
        .eq('isActive', true)
        .order('joinedAt', { ascending: false }),

      supabase
        .from('company_invites')
        .select('id, email, role, status, createdAt, expiresAt')
        .eq('companyId', companyId)
        .in('status', ['PENDING'])
        .order('createdAt', { ascending: false })
    ]);

    if (usersResult.error) {
      throw usersResult.error;
    }

    if (invitesResult.error) {
      throw invitesResult.error;
    }

    // Transform data for consistent structure
    const teamMembers = [
      // Active users
      ...(usersResult.data || []).map((companyUser: any) => ({
        id: companyUser.id,
        email: companyUser.user?.email || '',
        firstName: companyUser.user?.firstName,
        lastName: companyUser.user?.lastName,
        displayName: companyUser.user?.displayName,
        avatar: companyUser.user?.avatar,
        role: companyUser.role,
        title: companyUser.title,
        status: 'ACTIVE' as const,
        isOwner: companyUser.isOwner,
        joinedAt: companyUser.joinedAt,
        lastActive: companyUser.user?.lastLoginAt || companyUser.lastActiveAt,
        departmentId: companyUser.departmentId,
        type: 'user'
      })),
      // Pending invites
      ...(invitesResult.data || []).map((invite: any) => ({
        id: invite.id,
        email: invite.email,
        firstName: null,
        lastName: null,
        displayName: null,
        avatar: null,
        role: invite.role,
        title: null,
        status: invite.status as 'PENDING',
        isOwner: false,
        joinedAt: null,
        lastActive: null,
        departmentId: null,
        type: 'invite',
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt
      }))
    ];

    return NextResponse.json({ teamMembers });

  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const companyId = params.companyId;
    const body = await request.json();
    const { emails, role, invitedBy } = body;

    if (!companyId || !emails || !role) {
      return NextResponse.json(
        { error: 'Company ID, emails, and role are required' },
        { status: 400 }
      );
    }

    // Parse emails
    const emailList = emails
      .split(',')
      .map((email: string) => email.trim())
      .filter((email: string) => email.length > 0);

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid email is required' },
        { status: 400 }
      );
    }

    // Verify company exists and user has permission
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .eq('isActive', true)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Create invites for each email
    const invites = emailList.map((email: string) => ({
      companyId,
      email,
      role,
      status: 'PENDING',
      invitedBy: invitedBy || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      createdAt: new Date().toISOString()
    }));

    const { data: createdInvites, error: inviteError } = await supabase
      .from('company_invites')
      .insert(invites)
      .select();

    if (inviteError) {
      if (inviteError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'One or more users are already invited or part of the company' },
          { status: 409 }
        );
      }
      throw inviteError;
    }

    return NextResponse.json({
      message: `Successfully sent ${createdInvites.length} invitation(s)`,
      invites: createdInvites
    });

  } catch (error) {
    console.error('Error creating invites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
