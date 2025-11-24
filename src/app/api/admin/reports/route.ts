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
    console.error('Error fetching authenticated user for report creation:', userError);
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
    console.error('Error loading profile for report creation:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  if (!(profile.role === 'admin' || profile.role === 'manager')) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || typeof body.projectId !== 'string') {
    return NextResponse.json({ error: 'Title and project are required.' }, { status: 400 });
  }

  const title = body.title.trim();
  const projectId = body.projectId.trim();
  if (!title || !projectId) {
    return NextResponse.json({ error: 'Title and project cannot be empty.' }, { status: 400 });
  }

  const { data: report, error: insertError } = await supabase
    .from('reports')
    .insert({
      title,
      project_id: projectId,
      org_id: profile.org_id,
      created_by: user.id,
      status: 'draft',
      pdf_object_key: null,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating report:', insertError);
    return NextResponse.json({ error: insertError.message || 'Unable to create report.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, reportId: report.id });
}
