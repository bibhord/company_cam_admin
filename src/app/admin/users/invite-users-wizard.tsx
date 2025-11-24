'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type OrgRole = 'admin' | 'manager' | 'standard' | 'restricted';

interface InviteDraft {
  id: string;
  email: string;
  role: OrgRole;
}

const roleOptions: Array<{
  value: OrgRole;
  label: string;
  description: string;
}> = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Has complete control over account.',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Access to all projects and can manage users.',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: "Access to all projects but can't manage users.",
  },
  {
    value: 'restricted',
    label: 'Restricted',
    description: 'Can only access projects they create or are assigned to.',
  },
];

export function InviteUsersWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteDraft[]>([
    { id: crypto.randomUUID(), email: '', role: 'standard' },
  ]);

  const canContinue = useMemo(() => {
    if (invites.length === 0) return false;
    return invites.every((invite) => invite.email.trim().length > 0);
  }, [invites]);

  const handleAddInvite = () => {
    setInvites((prev) => [...prev, { id: crypto.randomUUID(), email: '', role: 'standard' }]);
  };

  const handleRemoveInvite = (id: string) => {
    setInvites((prev) => prev.filter((invite) => invite.id !== id));
  };

  const handleSendInvites = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invites: invites.map(({ email, role }) => ({
            email,
            role,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to send invitations.');
      }

      setStep(3);
      router.refresh();
    } catch (err) {
      console.error('Error inviting users:', err);
      setError(err instanceof Error ? err.message : 'Unexpected error sending invitations.');
    } finally {
      setPending(false);
    }
  };

  const resetWizard = () => {
    setInvites([{ id: crypto.randomUUID(), email: '', role: 'standard' }]);
    setStep(1);
    setError(null);
  };

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <header className="flex items-center gap-3 text-sm font-medium text-slate-600">
        <StepPill active={step === 1} completed={step > 1} label="Add Emails" number={1} />
        <span className="text-slate-300">—</span>
        <StepPill active={step === 2} completed={step > 2} label="Review Invites" number={2} />
        <span className="text-slate-300">—</span>
        <StepPill active={step === 3} completed={false} label="Done" number={3} />
      </header>

      {step === 1 ? (
        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Set Roles and Send</h2>
            <p className="mt-2 text-sm text-slate-600">
              Set each user&apos;s role. Don&apos;t worry, this can be changed later.
            </p>
          </div>

          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={invite.email}
                    onChange={(event) =>
                      setInvites((prev) =>
                        prev.map((row) =>
                          row.id === invite.id ? { ...row, email: event.target.value } : row
                        )
                      )
                    }
                    placeholder="user@example.com"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div className="w-full md:w-52">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </label>
                  <RoleSelect
                    value={invite.role}
                    onChange={(role) =>
                      setInvites((prev) =>
                        prev.map((row) => (row.id === invite.id ? { ...row, role } : row))
                      )
                    }
                  />
                </div>
                {invites.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Remove invite"
                    className="self-start rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                    onClick={() => handleRemoveInvite(invite.id)}
                  >
                    &minus;
                  </button>
                ) : (
                  <div className="h-10 w-10" aria-hidden />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddInvite}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            + Invite Another User
          </button>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              Review Invites
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Review Invites</h2>
            <p className="mt-2 text-sm text-slate-600">
              Confirm email addresses and roles before sending invitations.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm">
                {invites.map((invite) => {
                  const option = roleOptions.find((role) => role.value === invite.role)!;
                  return (
                    <tr key={invite.id}>
                      <td className="px-4 py-3 text-slate-900">{invite.email}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{option.label}</td>
                      <td className="px-4 py-3 text-slate-600">{option.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleSendInvites}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {pending ? 'Sending…' : 'Send Invitations'}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="mt-8 space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Invitations sent!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your teammates will receive an email with instructions to complete their accounts.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetWizard}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Invite More Users
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Refresh List
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepPill({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
          completed
            ? 'border-emerald-400 bg-emerald-100 text-emerald-600'
            : active
            ? 'border-indigo-500 bg-indigo-100 text-indigo-600'
            : 'border-slate-300 text-slate-400'
        }`}
      >
        {completed ? '✓' : number}
      </span>
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          active ? 'text-indigo-500' : completed ? 'text-emerald-500' : 'text-slate-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: OrgRole;
  onChange: (role: OrgRole) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as OrgRole)}
        className="mt-1 w-full appearance-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
