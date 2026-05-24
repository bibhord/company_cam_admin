import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { EMPTY_DOC, isValidDoc } from '@/lib/annotations';

async function authorize(photoId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return { error: NextResponse.json({ error: 'Profile not found' }, { status: 403 }) };

  const { data: photo } = await supabase
    .from('photos')
    .select('id, org_id')
    .eq('id', photoId)
    .single();
  if (!photo || photo.org_id !== profile.org_id) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  return { supabase, userId: user.id, orgId: profile.org_id };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if ('error' in auth) return auth.error;

  const { data } = await auth.supabase
    .from('photo_annotations')
    .select('data, updated_at')
    .eq('photo_id', id)
    .maybeSingle();

  return NextResponse.json({ data: data?.data ?? EMPTY_DOC, updated_at: data?.updated_at ?? null });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => null);
  if (!isValidDoc(body?.data)) {
    return NextResponse.json({ error: 'Invalid annotation payload' }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from('photo_annotations')
    .upsert({
      photo_id: id,
      org_id: auth.orgId,
      data: body.data,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to save annotations:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorize(id);
  if ('error' in auth) return auth.error;

  await auth.supabase.from('photo_annotations').delete().eq('photo_id', id);
  return NextResponse.json({ ok: true });
}
