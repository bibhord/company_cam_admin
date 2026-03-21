import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

const { POST } = await import('@/app/api/admin/reports/route');

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a report for admin users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
      mutationData: { id: 'report-1' },
    });

    const res = await POST(makeRequest({ title: 'Weekly Report', projectId: 'proj-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.reportId).toBe('report-1');
  });

  it('returns 403 for standard users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'standard' },
    });

    const res = await POST(makeRequest({ title: 'Report', projectId: 'proj-1' }));
    const json = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 400 when title is missing', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({ projectId: 'proj-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Title and project are required.');
  });

  it('returns 400 when projectId is missing', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({ title: 'Report' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Title and project are required.');
  });

  it('returns 400 when title is empty after trimming', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({ title: '  ', projectId: 'proj-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Title and project cannot be empty.');
  });

  it('allows manager role to create reports', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'manager' },
      mutationData: { id: 'report-2' },
    });

    const res = await POST(makeRequest({ title: 'Monthly', projectId: 'proj-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
