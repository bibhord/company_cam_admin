import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { vercelAddDomain, vercelRemoveDomain } from '@/lib/vercel-domains';

const ROOT_DOMAIN = 'captureyourwork.com';
const RESERVED_SLUGS = new Set([
  'app', 'www', 'api', 'admin', 'superadmin', 'auth', 'login', 'signup',
  'm', 'portfolio', 'mail', 'blog', 'help', 'support', 'docs', 'status',
]);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/@/g, '-')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

async function loadOrgForUser() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, is_admin')
    .eq('user_id', user.id)
    .maybeSingle<{ org_id: string; role: string; is_admin: boolean }>();

  if (!profile?.org_id) return null;
  if (!profile.is_admin && profile.role !== 'admin') return null;
  return { userId: user.id, orgId: profile.org_id };
}

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * PATCH /api/admin/portfolio
 * Body: { slug?: string, action?: 'publish' | 'unpublish' }
 */
export async function PATCH(req: Request) {
  const ctx = await loadOrgForUser();
  if (!ctx) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });

  const supabase = svc();
  const { data: org } = await supabase
    .from('organizations')
    .select('portfolio_slug, portfolio_published')
    .eq('id', ctx.orgId)
    .maybeSingle<{ portfolio_slug: string | null; portfolio_published: boolean }>();

  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  // Update slug
  if (body.slug !== undefined) {
    const cleaned = slugify(body.slug);
    if (cleaned.length < 3) {
      return NextResponse.json({ error: 'Slug must be at least 3 characters (letters, numbers, hyphens).' }, { status: 400 });
    }
    if (RESERVED_SLUGS.has(cleaned)) {
      return NextResponse.json({ error: 'That slug is reserved.' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('portfolio_slug', cleaned)
      .neq('id', ctx.orgId)
      .maybeSingle<{ id: string }>();
    if (existing) {
      return NextResponse.json({ error: 'That slug is already taken.' }, { status: 409 });
    }

    // If publishing was already on, swap the Vercel domain
    if (org.portfolio_published && org.portfolio_slug && org.portfolio_slug !== cleaned) {
      await vercelRemoveDomain(`${org.portfolio_slug}.${ROOT_DOMAIN}`);
      const add = await vercelAddDomain(`${cleaned}.${ROOT_DOMAIN}`);
      if (!add.ok) {
        return NextResponse.json({ error: `Failed to register new subdomain: ${add.error}` }, { status: 500 });
      }
    }

    const { error: updErr } = await supabase
      .from('organizations')
      .update({ portfolio_slug: cleaned })
      .eq('id', ctx.orgId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    org.portfolio_slug = cleaned;
  }

  // Publish / unpublish
  if (body.action === 'publish') {
    if (!org.portfolio_slug) {
      return NextResponse.json({ error: 'Set a slug before publishing.' }, { status: 400 });
    }

    // Require at least 2 featured + completed projects
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .eq('featured', true)
      .eq('status', 'completed');

    if ((count ?? 0) < 2) {
      return NextResponse.json({
        error: 'You need at least 2 featured and completed projects to publish.',
      }, { status: 400 });
    }

    const add = await vercelAddDomain(`${org.portfolio_slug}.${ROOT_DOMAIN}`);
    if (!add.ok) {
      return NextResponse.json({ error: `Vercel: ${add.error}` }, { status: 500 });
    }

    const { error: updErr } = await supabase
      .from('organizations')
      .update({ portfolio_published: true })
      .eq('id', ctx.orgId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  } else if (body.action === 'unpublish') {
    if (org.portfolio_slug) {
      await vercelRemoveDomain(`${org.portfolio_slug}.${ROOT_DOMAIN}`);
    }
    const { error: updErr } = await supabase
      .from('organizations')
      .update({ portfolio_published: false })
      .eq('id', ctx.orgId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
