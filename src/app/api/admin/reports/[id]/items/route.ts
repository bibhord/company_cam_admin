import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ProfileRecord {
  org_id: string;
  role: 'admin' | 'manager' | 'standard' | 'restricted';
}

/**
 * PUT /api/admin/reports/[id]/items
 * Replaces all report_items for a report with a new ordered selection.
 * Body: { photoIds: string[] }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return NextResponse.json({ error: 'Unable to verify session.' }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) return NextResponse.json({ error: 'Unable to load profile.' }, { status: 500 });
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // Verify report belongs to this org
  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('id', reportId)
    .eq('org_id', profile.org_id)
    .single();

  if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.photoIds)) {
    return NextResponse.json({ error: 'photoIds array is required.' }, { status: 400 });
  }

  const photoIds = body.photoIds as string[];

  // Delete existing items then insert new selection
  const { error: deleteError } = await supabase
    .from('report_items')
    .delete()
    .eq('report_id', reportId);

  if (deleteError) return NextResponse.json({ error: 'Failed to update items.' }, { status: 500 });

  if (photoIds.length > 0) {
    const rows = photoIds.map((photoId, idx) => ({
      report_id: reportId,
      photo_id: photoId,
      sort_order: idx,
      caption: null,
    }));

    const { error: insertError } = await supabase.from('report_items').insert(rows);
    if (insertError) return NextResponse.json({ error: 'Failed to save items.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: photoIds.length });
}
