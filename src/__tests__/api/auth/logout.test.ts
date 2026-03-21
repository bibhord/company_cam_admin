import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

const { POST } = await import('@/app/api/auth/logout/route');

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on signout', async () => {
    mockSupabase = createSupabaseMock();

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('returns 500 when signout fails', async () => {
    mockSupabase = createSupabaseMock();
    mockSupabase.auth.signOut = vi.fn().mockResolvedValue({
      error: { message: 'Session expired' },
    });

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Session expired');
  });
});
