// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_HOSTS = new Set(['app.captureyourwork.com', 'www.captureyourwork.com', 'captureyourwork.com']);
const SUBDOMAIN_RE = /^([a-z0-9-]+)\.captureyourwork\.com$/i;

function needsAuth(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/superadmin')) return true;
  if (pathname.startsWith('/m/')) {
    return !pathname.startsWith('/m/login') &&
           !pathname.startsWith('/m/signup') &&
           !pathname.startsWith('/m/auth-callback');
  }
  if (pathname === '/m') return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  const pathname = req.nextUrl.pathname;

  // Portfolio subdomain routing: <slug>.captureyourwork.com → /portfolio/<slug>/...
  // Skip the app/marketing hosts.
  if (!APP_HOSTS.has(host)) {
    const hostNoPort = host.split(':')[0];
    const m = hostNoPort.match(SUBDOMAIN_RE);
    if (m) {
      const slug = m[1];
      // Don't double-rewrite if already on /portfolio path
      if (!pathname.startsWith('/portfolio/')) {
        const url = req.nextUrl.clone();
        url.pathname = `/portfolio/${slug}${pathname === '/' ? '' : pathname}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  // Auth check for protected app routes only
  if (!needsAuth(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const isMobile = pathname.startsWith('/m');
    const loginUrl = new URL(isMobile ? '/m/login' : '/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|sw.js|robots.txt|sitemap.xml).*)',
  ],
};
