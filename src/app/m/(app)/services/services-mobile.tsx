'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_TEMPLATES } from '@/lib/service-templates';

interface Category { id: string; name: string; sort_order: number }

interface Service {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  duration_min: number;
  price_cents: number | null;
  price_type: 'fixed' | 'from';
  is_active: boolean;
  sort_order: number;
}

interface Props {
  initialCategories: Category[];
  initialServices: Service[];
  canManage: boolean;
}

function formatPrice(cents: number | null, type: 'fixed' | 'from') {
  if (cents == null) return 'Quote';
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return type === 'from' ? `from $${dollars}` : `$${dollars}`;
}

export function MobileServicesManager({ initialCategories, initialServices, canManage }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [services, setServices] = useState(initialServices);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [addingServiceTo, setAddingServiceTo] = useState<string | null | undefined>(undefined);
  const [addingCategory, setAddingCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servicesByCat = useMemo(() => {
    const m = new Map<string | null, Service[]>();
    for (const s of services) {
      const k = s.category_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [services]);

  async function cloneTemplate(key: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/admin/services/clone-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: key }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not load template.');
      }
      const fresh = await fetch('/api/admin/services');
      if (fresh.ok) {
        const { categories: cats, services: svcs } = await fresh.json();
        setCategories(cats ?? []);
        setServices(svcs ?? []);
      }
      setTemplateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
    } finally { setBusy(false); }
  }

  async function createCategory(name: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/admin/service-categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sort_order: categories.length }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error);
      setCategories((c) => [...c, body]);
      setAddingCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
    } finally { setBusy(false); }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category? Services in it will become uncategorized.')) return;
    setBusy(true);
    const res = await fetch(`/api/admin/service-categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCategories((c) => c.filter((x) => x.id !== id));
      setServices((s) => s.map((x) => x.category_id === id ? { ...x, category_id: null } : x));
    }
    setBusy(false);
  }

  async function saveService(payload: Service, isNew: boolean) {
    setBusy(true); setError(null);
    try {
      const body = {
        name: payload.name,
        description: payload.description,
        category_id: payload.category_id,
        duration_min: payload.duration_min,
        price_cents: payload.price_cents,
        price_type: payload.price_type,
        is_active: payload.is_active,
      };
      const res = isNew
        ? await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(`/api/admin/services/${payload.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      if (isNew) setServices((s) => [...s, json]);
      else setServices((s) => s.map((x) => x.id === json.id ? json : x));
      setEditingService(null);
      setAddingServiceTo(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
    } finally { setBusy(false); }
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service?')) return;
    setBusy(true);
    const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    if (res.ok) setServices((s) => s.filter((x) => x.id !== id));
    setBusy(false);
  }

  const isEmpty = categories.length === 0 && services.length === 0;

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {canManage && (
        <div className="flex gap-2">
          <button
            onClick={() => setTemplateOpen(true)}
            disabled={busy}
            className="flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white active:bg-amber-600 disabled:opacity-50"
          >
            Use a template
          </button>
          <button
            onClick={() => setAddingCategory(true)}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-50 disabled:opacity-50"
          >
            + Category
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No services yet</p>
          <p className="mt-1 text-xs text-slate-400">Tap &quot;Use a template&quot; to get started.</p>
        </div>
      )}

      {categories.map((cat) => {
        const list = servicesByCat.get(cat.id) ?? [];
        return (
          <section key={cat.id} className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">{cat.name}</h2>
              {canManage && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setAddingServiceTo(cat.id)} className="text-xs font-semibold text-amber-600 active:text-amber-700">+ Service</button>
                  <button onClick={() => deleteCategory(cat.id)} className="text-xs text-slate-400 active:text-red-600">Delete</button>
                </div>
              )}
            </div>
            {list.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-slate-400">No services yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => canManage && setEditingService(s)}
                      className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left active:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                        {s.description && <p className="mt-0.5 truncate text-xs text-slate-500">{s.description}</p>}
                        <p className="mt-1 text-[11px] text-slate-400">
                          {s.duration_min} min · {formatPrice(s.price_cents, s.price_type)}
                          {!s.is_active && <span className="ml-2 text-amber-600">(hidden)</span>}
                        </p>
                      </div>
                      {canManage && (
                        <svg className="h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* Uncategorized */}
      {(servicesByCat.get(null)?.length ?? 0) > 0 && (
        <section className="rounded-2xl bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Uncategorized</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {(servicesByCat.get(null) ?? []).map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => canManage && setEditingService(s)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left active:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    {s.description && <p className="mt-0.5 truncate text-xs text-slate-500">{s.description}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {s.duration_min} min · {formatPrice(s.price_cents, s.price_type)}
                      {!s.is_active && <span className="ml-2 text-amber-600">(hidden)</span>}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Add Category sheet */}
      {addingCategory && (
        <BottomSheet title="Add category" onClose={() => setAddingCategory(false)}>
          <CategoryForm onSave={createCategory} onCancel={() => setAddingCategory(false)} busy={busy} />
        </BottomSheet>
      )}

      {/* Edit / Add service sheet */}
      {(editingService || addingServiceTo !== undefined) && (
        <BottomSheet
          title={editingService ? 'Edit service' : 'Add service'}
          onClose={() => { setEditingService(null); setAddingServiceTo(undefined); }}
        >
          <ServiceForm
            initial={editingService ?? {
              id: '', name: '', description: '', category_id: addingServiceTo ?? null,
              duration_min: 30, price_cents: null, price_type: 'fixed',
              is_active: true, sort_order: 0,
            }}
            categories={categories}
            onSave={(s) => saveService(s, !editingService)}
            onCancel={() => { setEditingService(null); setAddingServiceTo(undefined); }}
            onDelete={editingService ? () => { deleteService(editingService.id); setEditingService(null); } : undefined}
            busy={busy}
          />
        </BottomSheet>
      )}

      {/* Template picker */}
      {templateOpen && (
        <BottomSheet title="Pick a template" onClose={() => setTemplateOpen(false)}>
          <div className="space-y-2 p-4">
            <p className="mb-2 text-xs text-slate-500">
              Adds the template&apos;s categories and services to your catalog. Edit or delete anything afterward.
            </p>
            {SERVICE_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => cloneTemplate(t.key)}
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left active:bg-slate-50 disabled:opacity-50"
              >
                <p className="text-sm font-bold text-slate-900">{t.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t.blurb}</p>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {t.categories.length} categor{t.categories.length === 1 ? 'y' : 'ies'} · {t.categories.reduce((s, c) => s + c.services.length, 0)} services
                </p>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400">
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

function CategoryForm({ onSave, onCancel, busy }: { onSave: (name: string) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState('');
  return (
    <div className="space-y-3 p-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name (e.g. Color)"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-50">Cancel</button>
        <button onClick={() => name.trim() && onSave(name.trim())} disabled={busy || !name.trim()} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          Add
        </button>
      </div>
    </div>
  );
}

function ServiceForm({
  initial, categories, onSave, onCancel, onDelete, busy,
}: {
  initial: Service;
  categories: Category[];
  onSave: (s: Service) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initial.category_id);
  const [duration, setDuration] = useState(initial.duration_min);
  const [priceInput, setPriceInput] = useState(initial.price_cents == null ? '' : (initial.price_cents / 100).toString());
  const [priceType, setPriceType] = useState<'fixed' | 'from'>(initial.price_type);
  const [isActive, setIsActive] = useState(initial.is_active);

  function submit() {
    const cents = priceInput.trim() === '' ? null : Math.round(parseFloat(priceInput) * 100);
    onSave({
      ...initial,
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      duration_min: duration,
      price_cents: Number.isFinite(cents as number) ? cents : null,
      price_type: priceType,
      is_active: isActive,
    });
  }

  return (
    <div className="space-y-3 p-4">
      <label className="block text-xs font-medium text-slate-600">
        Name
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Category
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs font-medium text-slate-600">
          Duration (min)
          <input
            type="number" min={5} step={5} value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Price ($)
          <input
            type="number" min={0} step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="quote"
            className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Type
          <select
            value={priceType}
            onChange={(e) => setPriceType(e.target.value as 'fixed' | 'from')}
            className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2.5 text-sm"
          >
            <option value="fixed">Fixed</option>
            <option value="from">From</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Show on public portfolio
      </label>
      <div className="flex gap-2 pt-2">
        {onDelete && (
          <button onClick={onDelete} className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 active:bg-red-50">
            Delete
          </button>
        )}
        <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 active:bg-slate-50">Cancel</button>
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white active:bg-amber-600 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
