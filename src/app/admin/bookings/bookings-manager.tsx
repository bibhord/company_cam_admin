'use client';

import { useState } from 'react';

type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

interface Booking {
  id: string;
  service_name: string;
  duration_min: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  admin_notes: string | null;
  created_at: string;
}

interface Props {
  initialBookings: Booking[];
  canManage: boolean;
}

type TabFilter = 'all' | BookingStatus;

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function BookingsManager({ initialBookings, canManage }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [tab, setTab] = useState<TabFilter>('all');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  const counts: Record<TabFilter, number> = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    declined: bookings.filter((b) => b.status === 'declined').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  async function updateStatus(id: string, status: BookingStatus) {
    setBusy((b) => ({ ...b, [id]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to update booking.');
      }
      const updated = await res.json() as Booking;
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'declined', label: 'Declined' },
  ];

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={[
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  t.key === 'pending' && tab !== 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-600',
                ].join(' ')}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
          </svg>
          <p className="text-sm font-medium text-slate-600">No bookings here</p>
          <p className="mt-1 text-xs text-slate-400">
            {tab === 'all' ? 'Bookings from your public page will appear here.' : `No ${tab} bookings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{b.customer_name}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_COLORS[b.status]
                      }`}
                    >
                      {STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{b.service_name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(b.booking_date)} at {to12h(b.booking_time.slice(0, 5))}
                    {' · '}{b.duration_min} min
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {b.customer_email}
                    {b.customer_phone && ` · ${b.customer_phone}`}
                  </p>
                  {b.notes && (
                    <p className="mt-1.5 text-xs italic text-slate-500">&ldquo;{b.notes}&rdquo;</p>
                  )}
                </div>
              </div>

              {canManage && b.status === 'pending' && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => updateStatus(b.id, 'confirmed')}
                    disabled={busy[b.id]}
                    className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                  >
                    {busy[b.id] ? 'Saving…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => updateStatus(b.id, 'declined')}
                    disabled={busy[b.id]}
                    className="flex-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy[b.id] ? 'Saving…' : 'Decline'}
                  </button>
                </div>
              )}

              {canManage && b.status === 'confirmed' && (
                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <button
                    onClick={() => updateStatus(b.id, 'cancelled')}
                    disabled={busy[b.id]}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy[b.id] ? 'Saving…' : 'Cancel booking'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
