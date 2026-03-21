'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MobileHeader } from '../components/mobile-header';

interface Project {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state_zip: string | null;
  photo_count: number;
  updated_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/m/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.street_address && p.street_address.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.state_zip && p.state_zip.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col">
      <MobileHeader title="Projects" />

      <div className="px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-full bg-slate-200 p-0.5">
          <button
            onClick={() => setView('list')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              view === 'list'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              view === 'map'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : view === 'map' ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-10 w-10 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">Map view coming soon</p>
            <p className="mt-1 text-xs text-slate-500">
              View your projects on a map
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-10 w-10 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">No Projects Found</p>
            <p className="mt-1 text-xs text-slate-500">
              {search ? 'Try a different search term' : 'No projects have been created yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((project) => (
              <Link
                key={project.id}
                href={`/m/projects/${project.id}`}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm active:bg-slate-50"
              >
                {/* Folder icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                  <svg
                    className="h-5 w-5 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                    />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {project.name}
                  </p>
                  {(project.street_address || project.city || project.state_zip) && (
                    <p className="truncate text-xs text-slate-500">
                      {[project.street_address, project.city, project.state_zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>{project.photo_count} photo{project.photo_count !== 1 ? 's' : ''}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(project.updated_at)}</span>
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  className="h-4 w-4 shrink-0 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
