import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

// Mock createClient for service role client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: 'invited-user-1' } },
          error: null,
        }),
      },
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

// Set env vars before importing
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

const { POST } = await import('@/app/api/admin/users/route');

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/users (invite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invites a single user', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'standard',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.results).toHaveLength(1);
    expect(json.results[0].email).toBe('new@example.com');
    expect(json.results[0].success).toBe(true);
  });

  it('invites bulk users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({
      invites: [
        { email: 'user1@example.com', role: 'standard' },
        { email: 'user2@example.com', role: 'manager' },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.results).toHaveLength(2);
  });

  it('returns 403 for standard users', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'standard' },
    });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Forbidden.');
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase = createSupabaseMock({ user: null });

    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid emails provided', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({ email: '' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('At least one valid email is required.');
  });

  it('normalizes email to lowercase and trims', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'admin' },
    });

    const res = await POST(makeRequest({ email: '  Test@Example.COM  ' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.results[0].email).toBe('test@example.com');
  });

  it('allows manager role to invite', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1', role: 'manager' },
    });

    const res = await POST(makeRequest({ email: 'new@test.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
