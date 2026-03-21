'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { MobileHeader } from '../../components/mobile-header';

interface ProjectPhoto {
  id: string;
  name: string;
  notes: string | null;
  signed_url: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  street_address: string | null;
  city: string | null;
  state_zip: string | null;
  photo_count: number;
  updated_at: string;
  photos: ProjectPhoto[];
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
  const [tab, setTab] = useState<'photos' | 'details'>('photos');

  // Details form
  const [saving, setSaving] = useState(false);
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateZip, setStateZip] = useState('');

  // Photo edit
  const [editingPhoto, setEditingPhoto] = useState<ProjectPhoto | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function handleSaveDetails() {
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
        await fetchProject();
      }
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  }

  function openPhotoEdit(photo: ProjectPhoto) {
    setEditingPhoto(photo);
    setEditName(photo.name);
    setEditNotes(photo.notes ?? '');
  }

  async function handleSavePhoto() {
    if (!editingPhoto) return;
    setSavingPhoto(true);
    try {
      const res = await fetch(`/api/m/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, notes: editNotes }),
      });
      if (res.ok) {
        setEditingPhoto(null);
        await fetchProject();
      }
    } catch (err) {
      console.error('Failed to update photo:', err);
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleDeletePhoto() {
    if (!editingPhoto) return;
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingPhoto(true);
    try {
      const res = await fetch(`/api/m/photos/${editingPhoto.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEditingPhoto(null);
        await fetchProject();
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setDeletingPhoto(false);
    }
  }

  async function handleUploadToProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', id);
      formData.append('photoName', file.name.replace(/\.[^.]+$/, ''));

      const res = await fetch('/api/m/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchProject();
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="Project" showBack backHref="/m/projects" />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col">
        <MobileHeader title="Project" showBack backHref="/m/projects" />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-slate-500">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <MobileHeader title={project.name} showBack backHref="/m/projects" />

      <div className="p-4 space-y-4">
        {/* Project header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{project.photo_count} photo{project.photo_count !== 1 ? 's' : ''}</span>
              <span>&middot;</span>
              <span>Updated {timeAgo(project.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-full bg-slate-200 p-0.5">
          <button
            onClick={() => setTab('photos')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              tab === 'photos' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Photos ({project.photos.length})
          </button>
          <button
            onClick={() => setTab('details')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              tab === 'details' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            Details
          </button>
        </div>

        {/* Photos tab */}
        {tab === 'photos' && (
          <div className="space-y-3">
            {project.photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">No photos yet</p>
                <p className="mt-1 text-xs text-slate-500">Add photos to this project</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {project.photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => openPhotoEdit(photo)}
                    className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 text-left"
                  >
                    {photo.signed_url ? (
                      <img src={photo.signed_url} alt={photo.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6">
                      <p className="truncate text-xs font-medium text-white">{photo.name}</p>
                      <p className="text-[10px] text-white/70">{timeAgo(photo.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Add photo button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600 active:bg-amber-50 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                  Add Photo to Project
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadToProject}
              className="hidden"
            />
          </div>
        )}

        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Project Address
            </h3>

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

            <button
              onClick={handleSaveDetails}
              disabled={saving}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Photo Edit Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={() => setEditingPhoto(null)}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo preview */}
            {editingPhoto.signed_url && (
              <div className="relative h-48 w-full overflow-hidden rounded-t-2xl bg-slate-100">
                <img src={editingPhoto.signed_url} alt={editingPhoto.name} className="h-full w-full object-cover" />
                <button
                  onClick={() => setEditingPhoto(null)}
                  className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Photo Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this photo..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSavePhoto}
                  disabled={savingPhoto}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60"
                >
                  {savingPhoto ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleDeletePhoto}
                  disabled={deletingPhoto}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors active:bg-red-50 disabled:opacity-60"
                >
                  {deletingPhoto ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
