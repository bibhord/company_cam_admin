import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../../helpers/supabase-mock';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

let mockSupabase: ReturnType<typeof createSupabaseMock>;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

const { PUT } = await import('@/app/api/admin/notifications/route');

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/admin/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves notification settings', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1' },
    });

    const res = await PUT(makeRequest({
      settings: {
        email_enabled: true,
        push_enabled: false,
        email_digest: 'daily',
      },
      prefs: [],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('saves notification settings with prefs', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1' },
    });

    const res = await PUT(makeRequest({
      settings: { email_enabled: true, push_enabled: true },
      prefs: [
        { event: 'comment_reply', channel: 'email', enabled: true },
        { event: 'task_assigned', channel: 'push', enabled: false },
      ],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase = createSupabaseMock({ user: null });

    const res = await PUT(makeRequest({ settings: { email_enabled: true } }));
    const json = await res.json();

    expect(res.status).toBe(401);
  });

  it('returns 404 when profile has no org_id', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: null },
    });

    const res = await PUT(makeRequest({ settings: { email_enabled: true } }));
    const json = await res.json();

    expect(res.status).toBe(404);
  });

  it('returns 400 when settings payload is missing', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1' },
    });

    const res = await PUT(makeRequest({ prefs: [] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Missing settings payload.');
  });

  it('returns 400 for invalid request body', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1' },
    });

    const req = new Request('http://localhost/api/admin/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid',
    });

    const res = await PUT(req);
    const json = await res.json();

    expect(res.status).toBe(400);
  });

  it('filters out invalid event types from prefs', async () => {
    mockSupabase = createSupabaseMock({
      profile: { org_id: 'org-1' },
    });

    const res = await PUT(makeRequest({
      settings: { email_enabled: true, push_enabled: true },
      prefs: [
        { event: 'invalid_event', channel: 'email', enabled: true },
        { event: 'comment_reply', channel: 'invalid_channel', enabled: true },
        { event: 'comment_reply', channel: 'email', enabled: true },
      ],
    }));
    const json = await res.json();

    // Should succeed — invalid prefs filtered out, valid ones processed
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
