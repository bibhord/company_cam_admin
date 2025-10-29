import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  is_admin: boolean;
}

interface PhotoOrgRecord {
  org_id: string;
}

const ensureAdminContext = async (photoId: string) => {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error retrieving authenticated user:', userError);
    return { response: NextResponse.json({ error: 'Authentication error.' }, { status: 500 }) } as const;
  }

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, is_admin')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError) {
    console.error('Error fetching admin profile:', profileError);
    return { response: NextResponse.json({ error: 'Failed to load admin profile.' }, { status: 500 }) } as const;
  }

  let photoQuery = supabase
    .from('photos')
    .select('org_id')
    .eq('id', photoId);

  if (!profile?.is_admin) {
    photoQuery = photoQuery.eq('created_by', user.id);
  }

  const { data: photo, error: photoError } = await photoQuery.single<PhotoOrgRecord>();

  if (photoError || !photo) {
    if (photoError) {
      console.error('Error verifying photo ownership:', photoError);
    }
    return { response: NextResponse.json({ error: 'Photo not found.' }, { status: 404 }) } as const;
  }

  if (photo.org_id !== profile.org_id) {
    return { response: NextResponse.json({ error: 'Photo not found.' }, { status: 404 }) } as const;
  }

  return { supabase } as const;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const adminContext = await ensureAdminContext(id);
  if ('response' in adminContext) {
    return adminContext.response;
  }

  const supabase = adminContext.supabase;

  let payload: { tags?: unknown; notes?: unknown };
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON payload for photo update:', error);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawTags = payload.tags;
  const rawNotes = payload.notes;

  const normalizedTags = (() => {
    if (Array.isArray(rawTags)) {
      return rawTags.map((tag) => String(tag).trim()).filter(Boolean);
    }

    if (typeof rawTags === 'string') {
      return rawTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    if (rawTags == null) {
      return [] as string[];
    }

    return [String(rawTags).trim()].filter(Boolean);
  })();

  const normalizedNotes = (() => {
    if (typeof rawNotes === 'string') {
      const trimmed = rawNotes.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (rawNotes == null) {
      return null;
    }

    return String(rawNotes);
  })();

  const updates: Record<string, unknown> = {
    tags: normalizedTags,
    notes: normalizedNotes,
  };

  const { error: updateError } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update photo metadata:', updateError);
    return NextResponse.json({ error: 'Unable to update photo metadata.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const adminContext = await ensureAdminContext(id);
  if ('response' in adminContext) {
    return adminContext.response;
  }

  const supabase = adminContext.supabase;

  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Failed to delete photo:', deleteError);
    return NextResponse.json({ error: 'Unable to delete photo.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
