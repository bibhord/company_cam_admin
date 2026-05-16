const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const BASE = 'https://api.vercel.com';

function teamQuery() {
  return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
}

function authHeaders() {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is not set');
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export async function vercelAddDomain(name: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_PROJECT_ID) return { ok: false, error: 'VERCEL_PROJECT_ID not set' };

  const res = await fetch(`${BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery()}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });

  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => null);
  // Already attached to this project — treat as success
  if (body?.error?.code === 'domain_already_in_use_by_different_project') {
    return { ok: false, error: 'Domain is in use by another project.' };
  }
  if (body?.error?.code === 'domain_already_exists') {
    return { ok: true };
  }
  return { ok: false, error: body?.error?.message ?? `Vercel API error ${res.status}` };
}

export async function vercelRemoveDomain(name: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_PROJECT_ID) return { ok: false, error: 'VERCEL_PROJECT_ID not set' };

  const res = await fetch(
    `${BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(name)}${teamQuery()}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
  );

  if (res.ok || res.status === 404) return { ok: true };

  const body = await res.json().catch(() => null);
  return { ok: false, error: body?.error?.message ?? `Vercel API error ${res.status}` };
}
