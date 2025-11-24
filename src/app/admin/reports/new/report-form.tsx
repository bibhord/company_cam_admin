'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProjectOption {
  id: string;
  name: string | null;
}

interface CreateReportFormProps {
  projects: ProjectOption[];
}

export function CreateReportForm({ projects }: CreateReportFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          projectId,
          notes,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create report.');
      }

      const reportId = payload?.reportId as string | undefined;
      router.push(reportId ? `/admin/reports/${reportId}` : '/admin/reports');
    } catch (submitError) {
      console.error('Error creating report:', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Report details</h2>
      <p className="mt-1 text-sm text-slate-600">
        Select a project and give this report a clear title. You can attach photos after saving.
      </p>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="report-title">
            Report title
          </label>
          <input
            id="report-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Insurance Inspection — April 2025"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="report-project">
            Project
          </label>
          <select
            id="report-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            required
          >
            <option value="" disabled>
              Select a project
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name ?? 'Untitled Project'}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="report-notes">
            Internal notes (optional)
          </label>
          <textarea
            id="report-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Add context or outline what should be included in this report."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending ? 'Creating…' : 'Create report'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
