import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import { r2SignedUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

export default async function SuperadminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; page?: string }>;
}) {
  const { demo, page } = await searchParams;
  const includeDemo = demo === 'show';
  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: orgs } = await svc
    .from('organizations')
    .select('id, name, is_demo');

  const orgMap: Record<string, { name: string; is_demo: boolean }> = {};
  for (const o of orgs ?? []) orgMap[o.id] = { name: o.name, is_demo: o.is_demo };

  const visibleOrgIds = (orgs ?? [])
    .filter((o) => includeDemo || !o.is_demo)
    .map((o) => o.id);

  const { data: photos, count } = await svc
    .from('photos')
    .select('id, name, object_key, org_id, project_id, created_at, lat, lon', { count: 'exact' })
    .in('org_id', visibleOrgIds.length > 0 ? visibleOrgIds : ['00000000-0000-0000-0000-000000000000'])
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const signed = await Promise.all(
    (photos ?? []).map(async (p) => ({
      ...p,
      url: p.object_key ? await r2SignedUrl(p.object_key, 1800).catch(() => null) : null,
      org_name: orgMap[p.org_id]?.name ?? 'Unknown',
      org_is_demo: orgMap[p.org_id]?.is_demo ?? false,
    })),
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">All Photos</h1>
          <p className="mt-1 text-sm text-slate-500">{count ?? 0} total · page {pageNum} of {totalPages}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
          <Tab href="/superadmin/photos" label="Real orgs" active={!includeDemo} />
          <Tab href="/superadmin/photos?demo=show" label="Include demo" active={includeDemo} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {signed.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            <div className="relative aspect-square bg-slate-800">
              {p.url ? (
                <Image
                  src={p.url}
                  alt={p.name ?? ''}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-600">No image</div>
              )}
              {p.org_is_demo && (
                <span className="absolute top-2 right-2 rounded-full bg-violet-500/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                  demo
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs text-slate-300" title={p.name ?? ''}>{p.name ?? '—'}</p>
              <Link
                href={`/superadmin/orgs/${p.org_id}`}
                className="block truncate text-xs text-slate-500 hover:text-amber-400"
              >
                {p.org_name}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {signed.length === 0 && (
        <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900 py-12 text-center text-sm text-slate-500">
          No photos found.
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {pageNum > 1 && (
            <Link
              href={`/superadmin/photos?${new URLSearchParams({ ...(includeDemo && { demo: 'show' }), page: String(pageNum - 1) })}`}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              ← Previous
            </Link>
          )}
          <span className="text-xs text-slate-500">Page {pageNum} of {totalPages}</span>
          {pageNum < totalPages && (
            <Link
              href={`/superadmin/photos?${new URLSearchParams({ ...(includeDemo && { demo: 'show' }), page: String(pageNum + 1) })}`}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </Link>
  );
}
