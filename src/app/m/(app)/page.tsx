'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MobileHeader } from './components/mobile-header';
import { MobileAnnotationModal } from './components/mobile-annotation-modal';
import { BeforeAfterSlider } from './components/before-after-slider';
import { AnnotationOverlay } from '@/components/annotations/annotation-overlay';
import type { AnnotationDoc } from '@/lib/annotations';

interface Photo {
  id: string;
  name: string;
  signed_url: string | null;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  tags?: string[] | null;
  notes?: string | null;
  annotations?: AnnotationDoc | null;
  before_photo_id?: string | null;
}

function PhotoPreviewWithOverlay({ url, name, annotations }: { url: string; name: string; annotations: AnnotationDoc | null }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const hasAnnotations = !!annotations && annotations.shapes.length > 0;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="relative"
        style={
          natural
            ? { aspectRatio: `${natural.w} / ${natural.h}`, maxHeight: '100%', maxWidth: '100%', height: '100%' }
            : { height: '100%', width: '100%' }
        }
      >
        <img
          src={url}
          alt={name}
          className="h-full w-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
        {natural && hasAnnotations && annotations && (
          <AnnotationOverlay doc={annotations} naturalWidth={natural.w} naturalHeight={natural.h} />
        )}
      </div>
    </div>
  );
}

function PhotoThumb({ photo, className, iconClassName, pairRole }: { photo: Photo; className: string; iconClassName: string; pairRole?: 'before' | 'after' }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const hasAnnotations = !!photo.annotations && photo.annotations.shapes.length > 0;
  if (!photo.signed_url) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100`}>
        <svg className={iconClassName} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`relative ${className}`}>
      <img
        src={photo.signed_url}
        alt={photo.name}
        className="h-full w-full object-cover"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {hasAnnotations && natural && photo.annotations && (
        <AnnotationOverlay doc={photo.annotations} naturalWidth={natural.w} naturalHeight={natural.h} />
      )}
      {hasAnnotations && (
        <span
          aria-label="Has annotations"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
        </span>
      )}
      {pairRole && (
        <span
          aria-label={`Pair: ${pairRole}`}
          className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white shadow-sm"
        >
          {pairRole === 'before' ? 'B' : 'A'}
        </span>
      )}
    </div>
  );
}

interface Project {
  id: string;
  name: string;
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

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project assignment modal state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [photoName, setPhotoName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [detailProjects, setDetailProjects] = useState<Project[]>([]);
  const [loadingDetailProjects, setLoadingDetailProjects] = useState(false);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [pairPickerOpen, setPairPickerOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [pairBusy, setPairBusy] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  const photoById = useMemo(() => {
    const m = new Map<string, Photo>();
    for (const p of photos) m.set(p.id, p);
    return m;
  }, [photos]);
  const afterByBeforeId = useMemo(() => {
    const m = new Map<string, Photo>();
    for (const p of photos) if (p.before_photo_id) m.set(p.before_photo_id, p);
    return m;
  }, [photos]);

  async function patchPair(beforePhotoId: string | null) {
    if (!selectedPhoto) return;
    setPairBusy(true);
    setPairError(null);
    try {
      const res = await fetch(`/api/m/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before_photo_id: beforePhotoId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Unable to update pair.');
      }
      const updated = await res.json();
      setSelectedPhoto((curr) =>
        curr && curr.id === updated.id ? { ...curr, before_photo_id: updated.before_photo_id ?? null } : curr,
      );
      setPhotos((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, before_photo_id: updated.before_photo_id ?? null } : p)),
      );
      setPairPickerOpen(false);
    } catch (err) {
      setPairError(err instanceof Error ? err.message : 'Unable to update pair.');
    } finally {
      setPairBusy(false);
    }
  }

  function openEditDetails() {
    if (!selectedPhoto) return;
    setEditName(selectedPhoto.name ?? '');
    setEditTags((selectedPhoto.tags ?? []).join(', '));
    setEditNotes(selectedPhoto.notes ?? '');
    setDetailsError(null);
    setEditingDetails(true);
  }

  async function saveDetails() {
    if (!selectedPhoto) return;
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const res = await fetch(`/api/m/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, tags: editTags, notes: editNotes }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Unable to save photo.');
      }
      const updated = await res.json();
      const next: Photo = {
        ...selectedPhoto,
        name: updated.name ?? editName,
        tags: updated.tags ?? [],
        notes: updated.notes ?? null,
      };
      setSelectedPhoto(next);
      setPhotos((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
      setEditingDetails(false);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Unable to save photo.');
    } finally {
      setSavingDetails(false);
    }
  }

  async function fetchPhotos() {
    setLoading(true);
    try {
      const res = await fetch('/api/m/photos');
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPhotos();
  }, []);

  async function fetchProjects() {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/m/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store the file and show the project picker
    setPendingFile(file);
    setPhotoName(file.name.replace(/\.[^.]+$/, ''));
    setShowProjectModal(true);
    setProjectSearch('');
    setShowNewProject(false);
    setNewProjectName('');
    fetchProjects();

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function uploadWithProject(projectId: string | null) {
    if (!pendingFile) return;

    setShowProjectModal(false);
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      if (projectId) {
        formData.append('projectId', projectId);
      }
      const trimmedName = photoName.trim();
      if (trimmedName) {
        formData.append('photoName', trimmedName);
      }

      const res = await fetch('/api/m/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchPhotos();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || `Upload failed (${res.status})`;
        setUploadError(msg);
      }
    } catch (err) {
      setUploadError(`Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;

    setCreatingProject(true);
    try {
      const res = await fetch('/api/m/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const project = await res.json();
        await uploadWithProject(project.id);
      } else {
        console.error('Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setCreatingProject(false);
    }
  }

  function closeModal() {
    setShowProjectModal(false);
    setPendingFile(null);
  }

  async function openReassign() {
    setReassigning(true);
    setLoadingDetailProjects(true);
    try {
      const res = await fetch('/api/m/projects');
      if (res.ok) {
        const data = await res.json();
        setDetailProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoadingDetailProjects(false);
    }
  }

  async function handleReassign(projectId: string | null) {
    if (!selectedPhoto) return;
    try {
      const res = await fetch(`/api/m/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (res.ok) {
        setSelectedPhoto(null);
        setReassigning(false);
        await fetchPhotos();
      }
    } catch (err) {
      console.error('Failed to reassign photo:', err);
    }
  }

  const filteredProjects = projects.filter((p) => {
    if (!projectSearch.trim()) return true;
    return p.name.toLowerCase().includes(projectSearch.toLowerCase());
  });

  return (
    <div className="flex flex-col">
      <MobileHeader title="Capture Your Work" />

      {/* View toggle */}
      <div className="px-4 pt-4 pb-2">
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
            onClick={() => setView('grid')}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              view === 'grid'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="flex-1 text-sm text-red-600">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="text-red-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                <div className="h-14 w-14 animate-pulse rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-200" />
                  <div className="h-2 w-1/4 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">No Photos Yet</p>
            <p className="mt-1 text-center text-xs text-slate-500">
              Tap the camera button to capture your first job site photo
            </p>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-3 shadow-sm text-left"
              >
                <PhotoThumb
                  photo={photo}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                  iconClassName="h-6 w-6 text-slate-300"
                  pairRole={photo.before_photo_id ? 'after' : afterByBeforeId.has(photo.id) ? 'before' : undefined}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{photo.name}</p>
                  {photo.project_name && (
                    <p className="truncate text-xs text-slate-500">{photo.project_name}</p>
                  )}
                  <p className="text-xs text-slate-400">{timeAgo(photo.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 text-left"
              >
                <PhotoThumb
                  photo={photo}
                  className="absolute inset-0"
                  iconClassName="h-8 w-8 text-slate-300"
                  pairRole={photo.before_photo_id ? 'after' : afterByBeforeId.has(photo.id) ? 'before' : undefined}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6">
                  <p className="truncate text-xs font-medium text-white">{photo.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Camera FAB */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
      >
        {uploading ? (
          <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={() => { setSelectedPhoto(null); setReassigning(false); setEditingDetails(false); }}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo preview */}
            {selectedPhoto.signed_url && (
              <div className="relative h-64 w-full overflow-hidden rounded-t-2xl bg-slate-900">
                <PhotoPreviewWithOverlay
                  url={selectedPhoto.signed_url}
                  name={selectedPhoto.name}
                  annotations={selectedPhoto.annotations ?? null}
                />
                <button
                  onClick={() => { setSelectedPhoto(null); setReassigning(false); setEditingDetails(false); }}
                  className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="p-4 space-y-3">
              <h3 className="text-base font-semibold text-slate-900">{selectedPhoto.name}</h3>

              <div className="space-y-2">
                {/* Project row with reassign */}
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                  <span className="flex-1 text-sm text-slate-700">
                    {selectedPhoto.project_name ?? 'No project'}
                  </span>
                  <button
                    onClick={openReassign}
                    className="text-xs font-medium text-amber-600 active:text-amber-700"
                  >
                    {reassigning ? 'Cancel' : 'Change'}
                  </button>
                </div>

                {/* Reassign project list */}
                {reassigning && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    {loadingDetailProjects ? (
                      <div className="space-y-1 p-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {/* Unassign option */}
                        <button
                          onClick={() => handleReassign(null)}
                          className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                            !selectedPhoto.project_id ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-500'
                          }`}
                        >
                          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                          No project
                        </button>
                        {detailProjects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleReassign(p.id)}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 active:bg-slate-100 border-t border-slate-100 ${
                              selectedPhoto.project_id === p.id ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-700'
                            }`}
                          >
                            <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                            </svg>
                            <span className="truncate">{p.name}</span>
                            {selectedPhoto.project_id === p.id && (
                              <svg className="h-4 w-4 ml-auto shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                  <span className="text-sm text-slate-700">
                    {new Date(selectedPhoto.created_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Before/After pair status */}
                {(() => {
                  const beforePhoto = selectedPhoto.before_photo_id ? photoById.get(selectedPhoto.before_photo_id) ?? null : null;
                  const afterPhoto = afterByBeforeId.get(selectedPhoto.id) ?? null;
                  const partner = beforePhoto ?? afterPhoto ?? null;
                  if (partner) {
                    const role = beforePhoto ? 'After' : 'Before';
                    return (
                      <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">{role.toUpperCase()}</span>
                        <span className="flex-1 truncate text-sm text-violet-900">Paired with {partner.name}</span>
                        <button
                          type="button"
                          onClick={() => setComparisonOpen(true)}
                          className="text-xs font-semibold text-violet-700 active:text-violet-800"
                        >
                          Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Unpair: clear the after side. If this photo is the before, also clear from after.
                            if (beforePhoto) void patchPair(null);
                            else if (afterPhoto) void (async () => {
                              setPairBusy(true);
                              setPairError(null);
                              try {
                                const res = await fetch(`/api/m/photos/${afterPhoto.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ before_photo_id: null }),
                                });
                                if (!res.ok) throw new Error('Unable to unpair.');
                                setPhotos((prev) => prev.map((p) => (p.id === afterPhoto.id ? { ...p, before_photo_id: null } : p)));
                              } catch (err) {
                                setPairError(err instanceof Error ? err.message : 'Unable to unpair.');
                              } finally {
                                setPairBusy(false);
                              }
                            })();
                          }}
                          disabled={pairBusy}
                          className="text-xs text-violet-500 active:text-violet-700 disabled:opacity-50"
                        >
                          Unpair
                        </button>
                      </div>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={() => { setPairError(null); setPairPickerOpen(true); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-sm font-semibold text-violet-700 transition-colors active:bg-violet-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l2 2 4-4m-3-6.75h.008v.008H12V2.25Z" />
                      </svg>
                      Mark as After of…
                    </button>
                  );
                })()}
                {pairError && <p className="text-xs text-red-600">{pairError}</p>}
              </div>

              {editingDetails ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tags</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Comma separated"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  {detailsError && (
                    <p className="text-xs text-red-600">{detailsError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveDetails}
                      disabled={savingDetails}
                      className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white transition-colors active:bg-slate-900 disabled:opacity-60"
                    >
                      {savingDetails ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDetails(false)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 transition-colors active:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openEditDetails}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors active:bg-slate-50"
                >
                  Edit details
                </button>
              )}

              {selectedPhoto.signed_url && (
                <button
                  onClick={() => setAnnotationOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors active:bg-amber-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                  Annotate
                </button>
              )}

              <button
                onClick={() => { setSelectedPhoto(null); setReassigning(false); setEditingDetails(false); }}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPhoto?.signed_url && (
        <MobileAnnotationModal
          photoId={selectedPhoto.id}
          imageUrl={selectedPhoto.signed_url}
          open={annotationOpen}
          onClose={() => setAnnotationOpen(false)}
          onSaved={(savedDoc) => {
            const targetId = selectedPhoto.id;
            setSelectedPhoto((curr) => (curr && curr.id === targetId ? { ...curr, annotations: savedDoc } : curr));
            setPhotos((prev) => prev.map((p) => (p.id === targetId ? { ...p, annotations: savedDoc } : p)));
          }}
        />
      )}

      {/* Before-photo picker */}
      {pairPickerOpen && selectedPhoto && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40" onClick={() => setPairPickerOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Pick the &quot;before&quot; photo</h3>
              <button onClick={() => setPairPickerOpen(false)} className="rounded-full p-1 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {(() => {
                const candidates = photos.filter(
                  (p) => p.id !== selectedPhoto.id && !afterByBeforeId.has(p.id) && p.project_id === selectedPhoto.project_id,
                );
                if (candidates.length === 0) {
                  return (
                    <p className="px-2 py-6 text-center text-sm text-slate-500">
                      No eligible photos in this project. The before photo must be in the same project and not already paired.
                    </p>
                  );
                }
                return (
                  <div className="grid grid-cols-3 gap-2">
                    {candidates.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => void patchPair(p.id)}
                        disabled={pairBusy}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 disabled:opacity-50"
                      >
                        {p.signed_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.signed_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-1 text-left text-[10px] font-medium text-white">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
              {pairError && <p className="mt-2 text-xs text-red-600">{pairError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Before/after comparison slider */}
      {comparisonOpen && selectedPhoto && (() => {
        const beforePhoto = selectedPhoto.before_photo_id ? photoById.get(selectedPhoto.before_photo_id) ?? null : null;
        const afterPhoto = afterByBeforeId.get(selectedPhoto.id) ?? null;
        const before = beforePhoto ?? selectedPhoto;
        const after = beforePhoto ? selectedPhoto : afterPhoto;
        if (!after || !before.signed_url || !after.signed_url) return null;
        return (
          <BeforeAfterSlider
            beforeUrl={before.signed_url}
            afterUrl={after.signed_url}
            beforeLabel={before.name}
            afterLabel={after.name}
            onClose={() => setComparisonOpen(false)}
          />
        );
      })()}

      {/* Project Assignment Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={closeModal}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Assign to Project</h3>
              <button onClick={closeModal} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Photo name */}
            <div className="px-4 pt-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Photo Name</label>
              <input
                type="text"
                placeholder="Name this photo..."
                value={photoName}
                onChange={(e) => setPhotoName(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Search */}
            <div className="px-4 pt-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Project list */}
            <div className="max-h-64 overflow-y-auto px-4 py-2">
              {loadingProjects ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Skip / No project */}
                  <button
                    onClick={() => uploadWithProject(null)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Skip — No project</p>
                      <p className="text-xs text-slate-400">Upload without assigning</p>
                    </div>
                  </button>

                  {/* Existing projects */}
                  {filteredProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => uploadWithProject(project.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                        <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                        </svg>
                      </div>
                      <p className="truncate text-sm font-medium text-slate-900">{project.name}</p>
                    </button>
                  ))}

                  {filteredProjects.length === 0 && !loadingProjects && (
                    <p className="py-3 text-center text-xs text-slate-400">No projects found</p>
                  )}
                </>
              )}
            </div>

            {/* Create new project */}
            <div className="border-t border-slate-100 px-4 py-3">
              {showNewProject ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || creatingProject}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60"
                  >
                    {creatingProject ? '...' : 'Create'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewProject(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600 active:bg-amber-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create New Project
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
