'use client';

import { useState, useEffect, useCallback } from 'react';

interface ServiceRow {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number | null;
  price_type: 'fixed' | 'from';
  sort_order: number;
}

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

interface Props {
  orgId: string;
  orgName: string;
  services: ServiceRow[];
  categories: CategoryRow[];
  preselectedServiceId: string | null;
  playfairClass: string;
}

type Step = 'service' | 'date' | 'time' | 'details' | 'done';

function formatPrice(cents: number | null, type: 'fixed' | 'from') {
  if (cents == null) return 'Quote on request';
  if (cents === 0) return 'Free';
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return type === 'from' ? `From $${dollars}` : `$${dollars}`;
}

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const STEP_LABELS: Record<Step, string> = {
  service: 'Service',
  date: 'Date',
  time: 'Time',
  details: 'Details',
  done: 'Done',
};
const STEPS: Step[] = ['service', 'date', 'time', 'details', 'done'];

// ── Mini Calendar ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarProps {
  selected: string | null;
  onSelect: (date: string) => void;
  closedDays: Set<number>; // day_of_week values that are closed
}

function MiniCalendar({ selected, onSelect, closedDays }: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function pad(n: number) { return String(n).padStart(2, '0'); }

  const cells: Array<number | null> = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {/* Month nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[11px] font-semibold uppercase text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
          const dateObj = new Date(dateStr + 'T12:00:00');
          const dow = dateObj.getDay();
          const isPast = dateObj < today;
          const isClosed = closedDays.has(dow);
          const isDisabled = isPast || isClosed;
          const isSelected = selected === dateStr;
          const isToday =
            dateObj.getFullYear() === today.getFullYear() &&
            dateObj.getMonth() === today.getMonth() &&
            dateObj.getDate() === today.getDate();

          return (
            <button
              key={dateStr}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(dateStr)}
              className={[
                'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition',
                isSelected
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isDisabled
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700',
                isToday && !isSelected ? 'ring-1 ring-amber-400' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────────

export function BookingForm({
  orgId,
  services,
  categories,
  preselectedServiceId,
  playfairClass,
}: Props) {
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(
    () => services.find((s) => s.id === preselectedServiceId) ?? null,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Business hours for the calendar
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set([0])); // default Sunday closed
  const [hoursLoaded, setHoursLoaded] = useState(false);

  // Details form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load business hours to know which days are closed
  useEffect(() => {
    if (hoursLoaded) return;
    fetch(`/api/public/bookings/slots?org_id=${orgId}&date=${new Date().toISOString().slice(0, 10)}&duration_min=60`)
      .then(() => {
        // Load all 7 days to build closed set — use the admin endpoint is behind auth,
        // so we probe each day of the week by fetching slots for that specific day
        // and checking if the API returns empty or not. Instead, we'll fetch a known
        // week's worth of slot queries to figure out which days are closed.
        // Since business hours are public for published orgs, we can fetch a reference week.
        const monday = new Date();
        monday.setDate(monday.getDate() - monday.getDay() + 1); // this Monday
        const probes = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d.toISOString().slice(0, 10);
        });
        return Promise.all(
          probes.map(async (date) => {
            const r = await fetch(
              `/api/public/bookings/slots?org_id=${orgId}&date=${date}&duration_min=60`,
            );
            const json = await r.json() as { slots: string[] };
            return { dow: new Date(date + 'T12:00:00').getDay(), empty: json.slots.length === 0 };
          }),
        );
      })
      .then((results) => {
        if (!Array.isArray(results)) return;
        const closed = new Set<number>(
          results.filter((r) => r.empty).map((r) => r.dow),
        );
        setClosedDays(closed);
        setHoursLoaded(true);
      })
      .catch(() => setHoursLoaded(true));
  }, [orgId, hoursLoaded]);

  const fetchSlots = useCallback(
    async (date: string, durationMin: number) => {
      setLoadingSlots(true);
      setSlots([]);
      try {
        const r = await fetch(
          `/api/public/bookings/slots?org_id=${orgId}&date=${date}&duration_min=${durationMin}`,
        );
        const json = await r.json() as { slots: string[] };
        setSlots(json.slots ?? []);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [orgId],
  );

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    if (selectedService) {
      fetchSlots(date, selectedService.duration_min).catch(() => null);
    }
    setStep('time');
  }

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (!name.trim() || !email.trim()) {
      setSubmitError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          service_id: selectedService.id,
          service_name: selectedService.name,
          duration_min: selectedService.duration_min,
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim() || null,
          notes: notes.trim() || null,
          booking_date: selectedDate,
          booking_time: selectedTime,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? 'Failed to submit booking.');
      }
      setStep('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepIndex = STEPS.indexOf(step);

  // Build service groups
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const servicesByCat = new Map<string | null, ServiceRow[]>();
  for (const s of services) {
    const k = s.category_id;
    if (!servicesByCat.has(k)) servicesByCat.set(k, []);
    servicesByCat.get(k)!.push(s);
  }

  return (
    <div>
      {/* Step indicator */}
      {step !== 'done' && (
        <div className="mb-6 flex items-center gap-0">
          {(['service', 'date', 'time', 'details'] as Step[]).map((s, i) => {
            const idx = STEPS.indexOf(s);
            const isCurrent = s === step;
            const isDone = currentStepIndex > idx;
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition',
                      isCurrent
                        ? 'bg-amber-500 text-white'
                        : isDone
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-stone-200 text-slate-400',
                    ].join(' ')}
                  >
                    {isDone ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-medium ${
                      isCurrent ? 'text-amber-600' : isDone ? 'text-slate-400' : 'text-slate-300'
                    }`}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < 3 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 rounded-full transition ${
                      currentStepIndex > idx ? 'bg-amber-400' : 'bg-stone-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Step: Service ── */}
      {step === 'service' && (
        <div>
          <h2 className={`mb-4 text-lg font-bold text-slate-900 ${playfairClass}`}>
            Choose a service
          </h2>
          <div className="space-y-6">
            {Array.from(servicesByCat.entries()).map(([catId, svcs]) => (
              <div key={catId ?? '_uncategorized'}>
                {catId && catMap.get(catId) && (
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {catMap.get(catId)!.name}
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {svcs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        setStep('date');
                      }}
                      className={[
                        'flex items-start justify-between gap-3 rounded-2xl border p-4 text-left shadow-sm transition',
                        selectedService?.id === s.id
                          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                          : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/50',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        {s.description && (
                          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{s.description}</p>
                        )}
                        <p className="mt-1.5 text-xs text-slate-400">{s.duration_min} min</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-amber-600">
                        {formatPrice(s.price_cents, s.price_type)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: Date ── */}
      {step === 'date' && selectedService && (
        <div>
          <h2 className={`mb-1 text-lg font-bold text-slate-900 ${playfairClass}`}>
            Pick a date
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Booking for: <span className="font-medium text-slate-700">{selectedService.name}</span>
            {' · '}{selectedService.duration_min} min
          </p>
          <MiniCalendar
            selected={selectedDate}
            onSelect={handleDateSelect}
            closedDays={closedDays}
          />
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setStep('service')}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-stone-100"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Time ── */}
      {step === 'time' && selectedService && selectedDate && (
        <div>
          <h2 className={`mb-1 text-lg font-bold text-slate-900 ${playfairClass}`}>
            Choose a time
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            {formatDateDisplay(selectedDate)}
          </p>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white py-10 text-center">
              <p className="text-sm font-medium text-slate-600">No availability on this date</p>
              <p className="mt-1 text-xs text-slate-400">Please pick a different day.</p>
              <button
                onClick={() => setStep('date')}
                className="mt-4 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-400"
              >
                Change date
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedTime(slot);
                    setStep('details');
                  }}
                  className={[
                    'rounded-xl border py-2.5 text-sm font-medium transition',
                    selectedTime === slot
                      ? 'border-amber-400 bg-amber-500 text-white shadow-sm'
                      : 'border-stone-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50',
                  ].join(' ')}
                >
                  {to12h(slot)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setStep('date')}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-stone-100"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Details ── */}
      {step === 'details' && selectedService && selectedDate && selectedTime && (
        <div>
          <h2 className={`mb-1 text-lg font-bold text-slate-900 ${playfairClass}`}>
            Your details
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            {selectedService.name} · {formatDateDisplay(selectedDate)} at {to12h(selectedTime)}
          </p>

          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">
              Full name <span className="text-red-500">*</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone (optional)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Notes (optional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any details or special requests…"
                className="mt-1 w-full resize-none rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </label>
          </div>

          {submitError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="mt-4 flex justify-between gap-3">
            <button
              onClick={() => setStep('time')}
              className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-stone-100"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !email.trim()}
              className="flex-1 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting…
                </span>
              ) : (
                'Request booking'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === 'done' && selectedService && selectedDate && selectedTime && (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold text-slate-900 ${playfairClass}`}>
            Booking requested!
          </h2>
          <p className="mt-2 text-slate-500">
            We&apos;ve received your request and will confirm shortly.
          </p>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-slate-900">{selectedService.name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">{formatDateDisplay(selectedDate)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-900">{to12h(selectedTime)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-semibold text-slate-900">{selectedService.duration_min} min</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-900">{name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-semibold text-slate-900">{email}</span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            A confirmation will be sent to {email} once approved.
          </p>
        </div>
      )}
    </div>
  );
}
