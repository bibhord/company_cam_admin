import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

interface TargetProfile {
  user_id: string;
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
  is_active: boolean;
}

async function getContext(targetId: string) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;

  const { data: actor } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (!actor?.org_id) {
    return { error: NextResponse.json({ error: 'No organization' }, { status: 404 }) } as const;
  }
  if (actor.role !== 'admin' && actor.role !== 'manager') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }
  if (user.id === targetId) {
    return { error: NextResponse.json({ error: 'You cannot modify your own account here.' }, { status: 400 }) } as const;
  }

  const { data: target } = await supabase
    .from('profiles')
    .select('user_id, org_id, role, is_active')
    .eq('user_id', targetId)
    .single<TargetProfile>();

  if (!target || target.org_id !== actor.org_id) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) } as const;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { supabase, service, actor, target, orgId: actor.org_id } as const;
}

// PATCH — body { action: 'deactivate' | 'reactivate' }
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ctx = await getContext(id);
  if ('error' in ctx) return ctx.error;
  const { service, target, orgId } = ctx;

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== 'deactivate' && action !== 'reactivate') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'deactivate') {
    // Don't deactivate the last active admin
    if (target.role === 'admin') {
      const { count } = await service
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'admin')
        .eq('is_active', true);
      if ((count ?? 0) <= 1) {
        return NextResponse.json({
          error: 'Cannot deactivate the last active admin. Promote another user to admin first.',
        }, { status: 400 });
      }
    }
  }

  const { error: updateErr } = await service
    .from('profiles')
    .update({ is_active: action === 'reactivate' })
    .eq('user_id', target.user_id);

  if (updateErr) {
    console.error('Failed to update is_active:', updateErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  if (action === 'deactivate') {
    // Stop pushing notifications to this user's devices.
    await service.from('push_devices').delete().eq('user_id', target.user_id);
  }

  return NextResponse.json({ ok: true, action });
}

// DELETE — only allowed when the user has zero photos and zero projects.
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ctx = await getContext(id);
  if ('error' in ctx) return ctx.error;
  const { service, target } = ctx;

  if (target.role === 'admin') {
    return NextResponse.json({
      error: 'Admins cannot be hard-deleted. Demote first, or deactivate instead.',
    }, { status: 400 });
  }

  const [{ count: photoCount }, { count: projectCount }] = await Promise.all([
    service.from('photos').select('id', { count: 'exact', head: true }).eq('created_by', target.user_id),
    service.from('projects').select('id', { count: 'exact', head: true }).eq('created_by', target.user_id),
  ]);

  if ((photoCount ?? 0) > 0 || (projectCount ?? 0) > 0) {
    return NextResponse.json({
      error: 'User has photos or projects. Deactivate instead to preserve their content.',
      photoCount: photoCount ?? 0,
      projectCount: projectCount ?? 0,
    }, { status: 409 });
  }

  // Safe to delete. Profile row first, then auth user.
  await service.from('push_devices').delete().eq('user_id', target.user_id);
  await service.from('profiles').delete().eq('user_id', target.user_id);
  const { error: authErr } = await service.auth.admin.deleteUser(target.user_id);
  if (authErr) {
    console.error('Failed to delete auth user:', authErr);
    return NextResponse.json({ error: 'Profile deleted but auth user removal failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
