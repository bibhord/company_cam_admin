'use client';

import { useMemo, useState } from 'react';

type ChecklistFilter = 'all' | 'finished' | 'unfinished';

interface ChecklistSummary {
  id: string;
  name: string;
  projectName: string;
  createdAt: string;
  createdBy: string;
  progress: number;
  totalItems: number;
  doneItems: number;
  isFinished: boolean;
}

export function ChecklistsClient({ checklists }: { checklists: ChecklistSummary[] }) {
  const [filter, setFilter] = useState<ChecklistFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return checklists.filter((checklist) => {
      if (filter === 'finished' && !checklist.isFinished) return false;
      if (filter === 'unfinished' && checklist.isFinished) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        if (!checklist.name.toLowerCase().includes(needle) && !checklist.projectName.toLowerCase().includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [checklists, filter, search]);

  const counts = useMemo(() => {
    return checklists.reduce(
      (acc, checklist) => {
        if (checklist.isFinished) {
          acc.finished += 1;
        } else {
          acc.unfinished += 1;
        }
        acc.all += 1;
        return acc;
      },
      { all: 0, finished: 0, unfinished: 0 }
    );
  }, [checklists]);

  return (
    <div className="px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Checklist Feed</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor progress across every checklist in your projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for a checklist"
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            onClick={() => (window.location.href = '/admin/projects')}
          >
            Export Checklist Data
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">NEW</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {(['all', 'finished', 'unfinished'] as ChecklistFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === value
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="capitalize">{value}</span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold">
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-12 py-16 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">No Checklists Found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Checklists created within a project will show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((checklist) => (
            <div key={checklist.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{checklist.name}</h2>
                  <p className="text-xs text-slate-500">
                    {checklist.projectName} • Created {new Date(checklist.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    checklist.isFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {checklist.isFinished ? 'Finished' : 'In progress'}
                </span>
              </div>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Progress</span>
                  <span>
                    {checklist.doneItems}/{checklist.totalItems}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${checklist.progress}%` }}
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <a
                  href={`/admin/checklists/${checklist.id}`}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  View checklist
                </a>
                <a
                  href={`/admin/checklists/${checklist.id}/edit`}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Manage
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
