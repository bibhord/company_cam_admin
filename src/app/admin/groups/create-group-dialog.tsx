'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ProfileRow } from '../types';

interface CreateGroupDialogProps {
  orgId: string;
  users: ProfileRow[];
}

export function CreateGroupDialog({ users }: CreateGroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(value);
    });
  }, [users, search]);

  const toggle = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const close = () => {
    setOpen(false);
    setName('');
    setSearch('');
    setSelected([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          memberIds: selected,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create group.');
      }

      close();
      router.refresh();
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        <span className="text-lg">+</span>
        Create Group
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Group</h2>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-slate-600">
                Groups can be used to quickly access photos from a set of users.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="group-name">
                  Group Name
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Roofing Crew"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="group-members">
                  Group Members
                </label>
                <input
                  type="search"
                  placeholder="Search teammates..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <div className="mt-3 max-h-52 overflow-y-auto rounded-md border border-slate-200">
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">No teammates found.</p>
                  ) : (
                    <ul>
                      {filteredUsers.map((user) => {
                        const fullName =
                          [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed user';
                        const active = selected.includes(user.user_id);
                        return (
                          <li
                            key={user.user_id}
                            className={`flex items-center justify-between px-3 py-2 text-sm ${
                              active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{fullName}</p>
                              <p className="text-xs capitalize text-slate-500">{user.role}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggle(user.user_id)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                active
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              {active ? 'Remove' : 'Add'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {pending ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
