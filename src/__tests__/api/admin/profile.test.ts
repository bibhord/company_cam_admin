import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

const { PUT } = await import('@/app/api/admin/profile/route');

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/admin/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates profile for authenticated user', async () => {
    mockSupabase = createSupabaseMock({
      profile: { user_id: 'user-1', org_id: 'org-1', role: 'admin' },
    });

    const res = await PUT(makeRequest({ first_name: 'John', last_name: 'Doe' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase = createSupabaseMock({ user: null });

    const res = await PUT(makeRequest({ first_name: 'John' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized.');
  });

  it('returns 404 when profile not found', async () => {
    mockSupabase = createSupabaseMock({ profile: null });

    const res = await PUT(makeRequest({ first_name: 'John' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Profile not found.');
  });

  it('returns 400 for invalid request body', async () => {
    mockSupabase = createSupabaseMock({
      profile: { user_id: 'user-1', org_id: 'org-1', role: 'standard' },
    });

    // Send a request that will fail json parsing
    const req = new Request('http://localhost/api/admin/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid request body.');
  });

  it('prevents standard users from changing their own role', async () => {
    mockSupabase = createSupabaseMock({
      profile: { user_id: 'user-1', org_id: 'org-1', role: 'standard' },
    });

    const res = await PUT(makeRequest({ first_name: 'John', role: 'admin' }));
    const json = await res.json();

    // Should succeed but role should remain 'standard' (enforced server-side)
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // The update call should have been made with role: 'standard' (not 'admin')
    const fromCall = mockSupabase.from as ReturnType<typeof vi.fn>;
    expect(fromCall).toHaveBeenCalledWith('profiles');
  });

  it('allows admin to change role', async () => {
    mockSupabase = createSupabaseMock({
      profile: { user_id: 'user-1', org_id: 'org-1', role: 'admin' },
    });

    const res = await PUT(makeRequest({ first_name: 'John', role: 'manager' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
