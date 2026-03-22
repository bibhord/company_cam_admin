import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/auth/success';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('OAuth callback error:', error);
      const loginUrl = next.startsWith('/admin') ? '/login' : '/m/login';
      return NextResponse.redirect(new URL(loginUrl, requestUrl.origin));
    }

    // Ensure profile exists for OAuth users
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Check if profile already exists
        const { data: existingProfile } = await serviceClient
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          // Create org + profile for new OAuth users
          const displayName = user.user_metadata?.full_name || user.email || 'User';
          const userEmail = user.email || '';
          const orgName = displayName !== userEmail && userEmail
            ? `${displayName}'s (${userEmail}) Organization`
            : `${displayName}'s Organization`;

          const { data: org, error: orgError } = await serviceClient
            .from('organizations')
            .insert({ name: orgName })
            .select('id')
            .single();

          if (orgError) {
            console.error('OAuth callback: failed to create organization:', orgError);
          } else if (org) {
            const { error: profileError } = await serviceClient.from('profiles').insert({
              user_id: user.id,
              org_id: org.id,
              first_name: user.user_metadata?.full_name?.split(' ')[0] ?? null,
              last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? null,
              role: 'admin',
              is_admin: true,
              is_active: true,
              onboarding_complete: false,
            });

            if (profileError) {
              console.error('OAuth callback: failed to create profile:', profileError);
            }
          }
        }
      } else {
        console.error('OAuth callback: missing SUPABASE_SERVICE_ROLE_KEY');
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
