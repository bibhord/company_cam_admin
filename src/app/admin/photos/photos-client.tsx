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
    <div className="px-4 py-5 lg:px-6 lg:py-10">
      <header className="mb-5 lg:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 lg:text-3xl">Photos</h1>
            <p className="mt-1 hidden text-sm text-slate-600 lg:block">
              Browse every photo captured by your team. Filter by project, status, or search by name.
            </p>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
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
                  window.location.href = '/admin/projects';
                }}
              >
                Manage Uploads
              </button>
            ) : null}
          </div>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search photos..."
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 lg:hidden"
        />
      </header>

      {/* Status filter chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2 lg:mb-6 lg:gap-3">
        {(['all', 'uploaded', 'pending', 'failed'] as PhotoStatusFilter[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition lg:px-4 lg:py-2 lg:text-sm ${
              statusFilter === status
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="capitalize">{status}</span>
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold lg:px-2 lg:text-xs">
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2 lg:mb-8 lg:gap-3">
        <label className="text-xs font-medium text-slate-600 lg:text-sm" htmlFor="project-filter">
          Project
        </label>
        <select
          id="project-filter"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 lg:flex-none lg:px-3 lg:py-2"
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
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center lg:p-12">
          <h2 className="text-base font-semibold text-slate-900 lg:text-lg">No photos match your filters</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try adjusting your filters or capture new photos from the mobile app.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {filtered.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
