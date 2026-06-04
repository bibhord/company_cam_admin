'use client';

import { useState, type ReactNode } from 'react';

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

type TabFilter = 'all' | 'pending' | 'confirmed' | 'declined';

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
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 active:bg-slate-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function BookingsMobile({ initialBookings, canManage }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [tab, setTab] = useState<TabFilter>('pending');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = tab === 'all' ? bookings : bookings.filter((b) => b.status === tab);

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  async function updateStatus(id: string, status: BookingStatus, note?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: note || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed.');
      }
      const updated = await res.json() as Booking;
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      setSelectedBooking(null);
      setAdminNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'all', label: 'All' },
    { key: 'declined', label: 'Declined' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pt-safe">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-lg font-bold text-slate-900">Bookings</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'shrink-0 rounded-t-lg px-4 py-2 text-xs font-semibold transition',
                tab === t.key
                  ? 'border-b-2 border-amber-500 text-amber-600'
                  : 'text-slate-500 active:text-slate-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-600">No bookings</p>
            <p className="mt-1 text-xs text-slate-400">
              {tab === 'all' ? 'Bookings appear here once submitted.' : `No ${tab} bookings.`}
            </p>
          </div>
        ) : (
          filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                if (canManage && b.status === 'pending') {
                  setSelectedBooking(b);
                  setAdminNote('');
                }
              }}
              className={[
                'w-full rounded-2xl bg-white p-4 text-left shadow-sm',
                canManage && b.status === 'pending' ? 'active:bg-slate-50' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{b.customer_name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{b.service_name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(b.booking_date)} · {to12h(b.booking_time.slice(0, 5))}
                  </p>
                  {b.notes && (
                    <p className="mt-1 truncate text-xs italic text-slate-400">&ldquo;{b.notes}&rdquo;</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      STATUS_COLORS[b.status]
                    }`}
                  >
                    {STATUS_LABELS[b.status]}
                  </span>
                  {canManage && b.status === 'pending' && (
                    <svg className="mt-1 h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Bottom sheet for confirm/decline */}
      {selectedBooking && canManage && (
        <BottomSheet
          title="Respond to booking"
          onClose={() => { setSelectedBooking(null); setAdminNote(''); }}
        >
          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
              <p className="font-semibold text-slate-900">{selectedBooking.customer_name}</p>
              <p className="text-slate-600">{selectedBooking.service_name}</p>
              <p className="text-xs text-slate-400">
                {formatDate(selectedBooking.booking_date)} at{' '}
                {to12h(selectedBooking.booking_time.slice(0, 5))}
                {' · '}{selectedBooking.duration_min} min
              </p>
              <p className="text-xs text-slate-400">{selectedBooking.customer_email}</p>
              {selectedBooking.customer_phone && (
                <p className="text-xs text-slate-400">{selectedBooking.customer_phone}</p>
              )}
              {selectedBooking.notes && (
                <p className="mt-1 text-xs italic text-slate-500">&ldquo;{selectedBooking.notes}&rdquo;</p>
              )}
            </div>

            {/* Optional note */}
            <label className="block text-xs font-medium text-slate-600">
              Note to customer (optional)
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                placeholder="Any message for the customer…"
                className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </label>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(selectedBooking.id, 'declined', adminNote)}
                disabled={busy}
                className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 active:bg-red-50 disabled:opacity-50"
              >
                Decline
              </button>
              <button
                onClick={() => updateStatus(selectedBooking.id, 'confirmed', adminNote)}
                disabled={busy}
                className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white active:bg-green-500 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
