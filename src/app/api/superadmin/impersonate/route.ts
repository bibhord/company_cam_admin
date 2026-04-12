import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/superadmin/impersonate
 * Body: { userId: string }
 * Returns a one-time magic link the super admin can open in incognito
 * to browse the app as that user. The link is never emailed — it is
 * returned directly to the super admin only.
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Verify caller is super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single<{ is_super_admin: boolean }>();

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch the target user's email
  const { data: targetAuth, error: targetErr } = await svc.auth.admin.getUserById(body.userId);
  if (targetErr || !targetAuth?.user?.email) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Generate a magic link (not emailed — returned here for the super admin to use)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: targetAuth.user.email,
    options: { redirectTo: `${appUrl}/admin` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[impersonate] link generation failed', linkErr);
    return NextResponse.json({ error: 'Failed to generate link.' }, { status: 500 });
  }

  return NextResponse.json({
    link: linkData.properties.action_link,
    email: targetAuth.user.email,
  });
}
