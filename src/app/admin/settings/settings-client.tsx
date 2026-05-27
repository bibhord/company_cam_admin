'use client';

import React, { useState } from 'react';
import type { ProfileRow } from '../types';

type OrgRole = 'admin' | 'manager' | 'standard' | 'restricted';

interface SettingsClientProps {
  userEmail: string;
  profile: ProfileRow;
}

const roleCards: Array<{
  key: OrgRole;
  title: string;
  description: string;
  learnMore: string;
}> = [
  {
    key: 'admin',
    title: 'Admin',
    description: 'Complete control. This is the only level that can upgrade or cancel the account.',
    learnMore: 'Learn More',
  },
  {
    key: 'manager',
    title: 'Manager',
    description: 'Can access all projects/features, manage users, and delete. Cannot manage billing.',
    learnMore: 'Learn More',
  },
  {
    key: 'standard',
    title: 'Standard',
    description: 'Can access all projects/features. Cannot delete or manage billing/users.',
    learnMore: 'Learn More',
  },
  {
    key: 'restricted',
    title: 'Restricted',
    description: 'Can only access projects they create or are assigned to.',
    learnMore: 'Learn More',
  },
];

export function SettingsClient({ userEmail, profile }: SettingsClientProps) {
  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [role, setRole] = useState<OrgRole>(profile.role ?? 'standard');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Unable to save settings.');
      }

      setMessage('Settings saved.');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-6 pt-10">
        <h1 className="text-3xl font-bold text-slate-900">My Settings</h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-6 pb-12">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Account Info</h2>
          <div className="rounded-xl border border-slate-200 bg-slate-50">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900">
                <span>Change Email Address or Password</span>
                <span className="text-slate-400 group-open:rotate-180">▾</span>
              </summary>
              <div className="space-y-4 border-t border-slate-200 bg-white px-4 py-5">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    Enter your current password to edit your login info
                    <span className="text-slate-400">ⓘ</span>
                  </p>
                  <input
                    type="password"
                    placeholder="Your Current Password"
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    disabled
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Don&apos;t know your password? <span className="text-indigo-600">Log out and reset it</span>
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-800">Update your login info</p>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    disabled
                  />
                </div>
              </div>
            </details>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Profile Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <LabeledInput
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <LabeledInput label="Phone Number" placeholder="(optional)" disabled />
            <LabeledInput label="Job Title" placeholder="(optional)" disabled />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">User Role</h2>
          <div className="grid gap-3 lg:grid-cols-4">
            {roleCards.map((card) => {
              const active = role === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setRole(card.key)}
                  className={`flex h-full flex-col gap-3 rounded-xl border p-4 text-left transition ${
                    active ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {active ? '•' : ''}
                    </span>
                    <p className="text-base font-semibold text-slate-900">{card.title}</p>
                  </div>
                  <p className="text-sm text-slate-600">{card.description}</p>
                  <span className="text-sm font-semibold text-indigo-600">{card.learnMore}</span>
                </button>
              );
            })}
          </div>
        </section>

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
          disabled
            ? 'border-slate-200 bg-slate-50 text-slate-500'
            : 'border-slate-300 focus:border-indigo-500'
        }`}
      />
    </div>
  );
}
