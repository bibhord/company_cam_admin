import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

// Import after mocks
const { POST } = await import('@/app/api/auth/login/route');

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success and isAdmin flag on valid login', async () => {
    mockSupabase = createSupabaseMock({
      user: { id: 'user-1', email: 'test@test.com' },
      profile: { is_admin: true },
    });

    const res = await POST(makeRequest({ email: 'test@test.com', password: 'pass123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.isAdmin).toBe(true);
  });

  it('returns isAdmin false for non-admin users', async () => {
    mockSupabase = createSupabaseMock({
      user: { id: 'user-2' },
      profile: { is_admin: false },
    });

    const res = await POST(makeRequest({ email: 'user@test.com', password: 'pass123' }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.isAdmin).toBe(false);
  });

  it('returns 400 when Supabase auth fails', async () => {
    mockSupabase = createSupabaseMock({
      user: null,
      userError: { message: 'Invalid login credentials' },
    });
    // Override signInWithPassword to return error
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const res = await POST(makeRequest({ email: 'bad@test.com', password: 'wrong' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid login credentials');
  });

  it('returns isAdmin false when profile not found', async () => {
    mockSupabase = createSupabaseMock({
      user: { id: 'user-3' },
      profile: null,
    });

    const res = await POST(makeRequest({ email: 'test@test.com', password: 'pass123' }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.isAdmin).toBe(false);
  });
});
