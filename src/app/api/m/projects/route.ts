import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state_zip: string | null;
  created_at: string;
  updated_at: string;
}

interface PhotoCountRecord {
  project_id: string;
  count: number;
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching authenticated user in m/projects route:', userError);
    return NextResponse.json({ error: 'Authentication error.' }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile in m/projects route:', profileError);
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, street_address, city, state_zip, created_at, updated_at')
    .eq('org_id', profile.org_id)
    .order('name', { ascending: true });

  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    return NextResponse.json({ error: 'Unable to fetch projects.' }, { status: 500 });
  }

  const projectIds = (projects as ProjectRecord[]).map((p) => p.id);

  let photoCounts: Record<string, number> = {};

  if (projectIds.length > 0) {
    const { data: counts, error: countsError } = await supabase
      .from('photos')
      .select('project_id')
      .eq('org_id', profile.org_id)
      .in('project_id', projectIds);

    if (countsError) {
      console.error('Error fetching photo counts:', countsError);
    } else if (counts) {
      photoCounts = (counts as PhotoCountRecord[]).reduce<Record<string, number>>((acc, row) => {
        acc[row.project_id] = (acc[row.project_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const projectsWithCounts = (projects as ProjectRecord[]).map((project) => ({
    ...project,
    photo_count: photoCounts[project.id] || 0,
  }));

  return NextResponse.json(projectsWithCounts);
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  }

  const body = await request.json();
  const name = (body.name || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
  }

  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      name,
      org_id: profile.org_id,
      created_by: user.id,
    })
    .select('id, name')
    .single();

  if (insertError) {
    console.error('Error creating project:', insertError);
    return NextResponse.json({ error: 'Unable to create project.' }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
