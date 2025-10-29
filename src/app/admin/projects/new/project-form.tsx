'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ProjectForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to create project.');
      }

      const payload = await response.json();
      const projectId = payload?.projectId as string | undefined;

      if (projectId) {
        router.push(`/admin/projects/${projectId}`);
      } else {
        router.push('/admin');
      }
    } catch (submitError) {
      console.error('Error creating project:', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Project details</h2>
      <p className="mt-1 text-sm text-gray-600">
        Choose a descriptive name so your team can easily find it in the mobile app.
      </p>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700" htmlFor="project-name">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Downtown Roofing — Phase 1"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending ? 'Creating…' : 'Create project'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
