import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error loading current user for groups:', userError);
    return NextResponse.json({ error: 'Unable to verify session.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Unable to load profile for group creation:', profileError);
    return NextResponse.json({ error: 'Profile lookup failed.' }, { status: 500 });
  }

  if (!(profile.role === 'admin' || profile.role === 'manager')) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
  }

  const name = body.name.trim();
  if (!name) {
    return NextResponse.json({ error: 'Group name cannot be empty.' }, { status: 400 });
  }

  const memberIds: string[] = Array.isArray(body.memberIds)
    ? body.memberIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];

  const { data: group, error: insertError } = await supabase
    .from('groups')
    .insert({
      name,
      org_id: profile.org_id,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error inserting group:', insertError);
    return NextResponse.json({ error: insertError.message || 'Failed to create group.' }, { status: 500 });
  }

  if (memberIds.length > 0) {
    const inserts = memberIds.map((userId) => ({
      group_id: group.id,
      user_id: userId,
    }));

    const { error: memberError } = await supabase.from('group_members').upsert(inserts, {
      onConflict: 'group_id,user_id',
    });

    if (memberError) {
      console.error('Error inserting group members:', memberError);
      return NextResponse.json(
        { error: 'Group created but failed to add members.' },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ success: true, groupId: group.id });
}
