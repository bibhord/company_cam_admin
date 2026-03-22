'use client';

import { useEffect, useRef, useState } from 'react';
import { MobileHeader } from './components/mobile-header';

interface Photo {
  id: string;
  name: string;
  signed_url: string | null;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
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
                {photo.signed_url ? (
                  <img src={photo.signed_url} alt={photo.name} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
                    <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                )}
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={() => { setSelectedPhoto(null); setReassigning(false); }}>
          <div
            className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo preview */}
            {selectedPhoto.signed_url && (
              <div className="relative h-64 w-full overflow-hidden rounded-t-2xl bg-slate-100">
                <img src={selectedPhoto.signed_url} alt={selectedPhoto.name} className="h-full w-full object-cover" />
                <button
                  onClick={() => { setSelectedPhoto(null); setReassigning(false); }}
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
              </div>

              <button
                onClick={() => { setSelectedPhoto(null); setReassigning(false); }}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors active:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
