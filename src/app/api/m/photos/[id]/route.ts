import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { r2Delete } from '@/lib/r2';

interface ProfileRecord {
  org_id: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!profile) {
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.notes === 'string') updates.notes = body.notes.trim() || null;
  if (body.project_id !== undefined) updates.project_id = body.project_id || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const { data: photo, error: updateError } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select('id, name, notes')
    .single();

  if (updateError) {
    console.error('Error updating photo:', updateError);
    return NextResponse.json({ error: 'Unable to update photo.' }, { status: 500 });
  }

  return NextResponse.json(photo);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!profile) {
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  // Get the photo to find the storage key
  const { data: photo } = await supabase
    .from('photos')
    .select('object_key')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  }

  // Delete from R2
  try {
    await r2Delete(photo.object_key);
  } catch (err) {
    console.error('Error deleting object from R2:', err);
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', id)
    .eq('org_id', profile.org_id);

  if (deleteError) {
    console.error('Error deleting photo:', deleteError);
    return NextResponse.json({ error: 'Unable to delete photo.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
