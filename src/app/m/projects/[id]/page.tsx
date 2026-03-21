'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MobileHeader } from '../../components/mobile-header';

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

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateZip, setStateZip] = useState('');

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/m/projects/${id}`);
        if (res.ok) {
          const data: Project = await res.json();
          setProject(data);
          setStreetAddress(data.street_address ?? '');
          setCity(data.city ?? '');
          setStateZip(data.state_zip ?? '');
        }
      } catch (err) {
        console.error('Failed to fetch project:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/m/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street_address: streetAddress,
          city,
          state_zip: stateZip,
        }),
      });
      if (res.ok) {
        const data: Project = await res.json();
        setProject(data);
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="Project Details" showBack backHref="/m/projects" />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="Project Details" showBack backHref="/m/projects" />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-slate-500">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <MobileHeader title="Project Details" showBack backHref="/m/projects" />

      <div className="p-4 space-y-6">
        {/* Project header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <svg
              className="h-6 w-6 text-amber-500"
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
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{project.name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{project.photo_count} photo{project.photo_count !== 1 ? 's' : ''}</span>
              <span>&middot;</span>
              <span>Updated {timeAgo(project.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Address section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Project Address
          </h3>

          {/* Street Address */}
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Street Address"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* City */}
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* State / ZIP */}
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="State / ZIP Code"
              value={stateZip}
              onChange={(e) => setStateZip(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
