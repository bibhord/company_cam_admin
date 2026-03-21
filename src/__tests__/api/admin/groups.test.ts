import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

const { POST } = await import('@/app/api/admin/groups/route');

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a group for admin/manager users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
      mutationData: { id: 'group-1' },
    });

    const res = await POST(makeRequest({ name: 'Field Crew' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.groupId).toBe('group-1');
  });

  it('returns 403 for standard users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'standard' },
    });

    const res = await POST(makeRequest({ name: 'Test Group' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Forbidden.');
  });

  it('returns 403 for restricted users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'restricted' },
    });

    const res = await POST(makeRequest({ name: 'Test Group' }));
    const json = await res.json();

    expect(res.status).toBe(403);
  });

  it('returns 400 when group name is missing', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'manager' },
    });

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Group name is required.');
  });

  it('returns 400 when group name is empty after trimming', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({ name: '   ' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Group name cannot be empty.');
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase = createSupabaseMock({ user: null });

    const res = await POST(makeRequest({ name: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(401);
  });

  it('allows manager role to create groups', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'manager' },
      mutationData: { id: 'group-2' },
    });

    const res = await POST(makeRequest({ name: 'Inspectors' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
