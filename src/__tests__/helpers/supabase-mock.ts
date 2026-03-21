import { vi } from 'vitest';

/**
 * Creates a chainable Supabase query mock.
 * Each method returns `this` so calls can be chained,
 * and the final awaitable resolves to { data, error }.
 */
export function createQueryMock(data: unknown = null, error: unknown = null) {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainable = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'then') {
          // Make it thenable — resolves like a Supabase query
          return (resolve: (v: unknown) => void) => resolve({ data, error });
        }
        if (!mock[prop]) {
          mock[prop] = vi.fn(() => chainable);
        }
        return mock[prop];
      },
    }
  );

  return chainable;
}

interface MockUser {
  id: string;
  email?: string;
}

interface SupabaseMockOptions {
  user?: MockUser | null;
  userError?: { message: string } | null;
  profile?: Record<string, unknown> | null;
  profileError?: { message: string } | null;
  /** Override the result of insert/update/delete/upsert operations */
  mutationData?: unknown;
  mutationError?: { message: string } | null;
}

/**
 * Creates a full mock Supabase client that can be returned
 * from `createRouteHandlerClient`.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const {
    user = { id: 'user-1', email: 'test@example.com' },
    userError = null,
    profile = { org_id: 'org-1', role: 'admin', is_admin: true },
    profileError = null,
    mutationData = null,
    mutationError = null,
  } = options;

  const mutationQuery = createQueryMock(mutationData, mutationError);
  const profileQuery = createQueryMock(profile, profileError);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profileQuery;
      return mutationQuery;
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null }),
      })),
    },
  };
}

/**
 * Sets up the standard mocks for Next.js route handler tests.
 * Call this in your vi.mock factories.
 */
export function mockNextHeaders() {
  return {
    cookies: vi.fn(() => ({})),
  };
}
