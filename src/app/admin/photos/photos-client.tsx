'use client';

import { useMemo, useState } from 'react';
import type { PhotoRecord, ProjectRecord } from '../types';
import { PhotoCard } from '../photo-card';

type PhotoStatusFilter = 'all' | 'pending' | 'failed' | 'uploaded';

interface PhotosClientProps {
  photos: PhotoRecord[];
  projects: Pick<ProjectRecord, 'id' | 'name'>[];
  canEdit: boolean;
}

export function PhotosClient({ photos, projects, canEdit }: PhotosClientProps) {
  const [statusFilter, setStatusFilter] = useState<PhotoStatusFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return photos.filter((photo) => {
      const matchesStatus =
        statusFilter === 'all' ||
        photo.upload_status === statusFilter ||
        photo.status === statusFilter;

      const matchesProject =
        projectFilter === 'all' || photo.project_id === projectFilter;

      const matchesSearch =
        search.trim().length === 0 ||
        (photo.name ?? '')
          .toLowerCase()
          .includes(search.trim().toLowerCase()) ||
        (photo.projects && 'name' in photo.projects
          ? (photo.projects.name ?? '')
              .toLowerCase()
              .includes(search.trim().toLowerCase())
          : Array.isArray(photo.projects)
          ? photo.projects
              .map((p) => p?.name ?? '')
              .join(' ')
              .toLowerCase()
              .includes(search.trim().toLowerCase())
          : false);

      return matchesStatus && matchesProject && matchesSearch;
    });
  }, [photos, statusFilter, projectFilter, search]);

  const statusCounts = useMemo(() => {
    return photos.reduce<Record<PhotoStatusFilter, number>>(
      (acc, photo) => {
        const status =
          (photo.upload_status as PhotoStatusFilter) ||
          (photo.status as PhotoStatusFilter) ||
          'all';
        if (status === 'pending' || status === 'failed' || status === 'uploaded') {
          acc[status] += 1;
        }
        acc.all += 1;
        return acc;
      },
      { all: 0, pending: 0, failed: 0, uploaded: 0 }
    );
  }, [photos]);

  return (
    <div className="px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Photos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse every photo captured by your team. Filter by project, status, or search by name.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search photos..."
            className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {canEdit ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              onClick={() => {
                // anchor to projects for uploads
                window.location.href = '/admin/projects';
              }}
            >
              Manage Uploads
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {(['all', 'uploaded', 'pending', 'failed'] as PhotoStatusFilter[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              statusFilter === status
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="capitalize">{status}</span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold">
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600" htmlFor="project-filter">
          Project
        </label>
        <select
          id="project-filter"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name ?? 'Untitled Project'}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No photos match your filters</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try adjusting your filters or capture new photos from the mobile app.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
