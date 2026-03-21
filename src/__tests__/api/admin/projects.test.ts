import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

const { POST } = await import('@/app/api/admin/projects/route');

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a project for admin users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', is_admin: true },
    });

    const res = await POST(makeRequest({ name: 'New Roof Job' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.projectId).toBeDefined();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase = createSupabaseMock({ user: null });

    const res = await POST(makeRequest({ name: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized.');
  });

  it('returns 403 when user is not admin', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', is_admin: false },
    });

    const res = await POST(makeRequest({ name: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Forbidden.');
  });

  it('returns 400 when project name is missing', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', is_admin: true },
    });

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Project name is required.');
  });

  it('returns 400 when project name is empty string', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', is_admin: true },
    });

    const res = await POST(makeRequest({ name: '   ' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Project name cannot be empty.');
  });

  it('returns 500 when auth errors', async () => {
    mockSupabase = createSupabaseMock({
      userError: { message: 'Auth failed' },
    });

    const res = await POST(makeRequest({ name: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Unable to verify current session.');
  });

  it('returns 500 when profile lookup fails', async () => {
    mockSupabase = createSupabaseMock({
      profileError: { message: 'DB error' },
    });

    const res = await POST(makeRequest({ name: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Unable to load profile.');
  });
});
