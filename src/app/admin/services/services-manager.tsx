'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_TEMPLATES } from '@/lib/service-templates';

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

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

function formatPrice(cents: number | null, type: 'fixed' | 'from'): string {
  if (cents == null) return 'Quote';
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return type === 'from' ? `from $${dollars}` : `$${dollars}`;
}

export function ServicesManager({ initialCategories, initialServices, canManage }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [services, setServices] = useState(initialServices);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingServiceTo, setAddingServiceTo] = useState<string | null>(null);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } finally {
      setBusy(false);
    }
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

  async function saveService(svc: Service, isNew: boolean) {
    setBusy(true); setError(null);
    try {
      const payload = {
        name: svc.name,
        description: svc.description,
        category_id: svc.category_id,
        duration_min: svc.duration_min,
        price_cents: svc.price_cents,
        price_type: svc.price_type,
        is_active: svc.is_active,
      };
      const res = isNew
        ? await fetch('/api/admin/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`/api/admin/services/${svc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error);
      if (isNew) setServices((s) => [...s, body]);
      else setServices((s) => s.map((x) => x.id === body.id ? body : x));
      setEditingService(null);
      setAddingServiceTo(null);
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

  const uncategorized = servicesByCat.get(null) ?? [];

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplateOpen(true)}
            disabled={busy}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Use a template
          </button>
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            + Category
          </button>
        </div>
      )}

      {addingCategory && (
        <InlineCategoryForm
          onCancel={() => setAddingCategory(false)}
          onSubmit={createCategory}
          busy={busy}
        />
      )}

      {categories.length === 0 && uncategorized.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">No services yet.</p>
          <p className="mt-1 text-xs text-slate-400">Start with a template or add categories manually.</p>
        </div>
      )}

      {categories.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          services={servicesByCat.get(cat.id) ?? []}
          canManage={canManage}
          onDelete={() => deleteCategory(cat.id)}
          onAddService={() => setAddingServiceTo(cat.id)}
          editingId={editingService?.id ?? null}
          onEdit={(s) => setEditingService(s)}
          onCancelEdit={() => setEditingService(null)}
          onSave={(s) => saveService(s, false)}
          onDeleteService={deleteService}
          isAdding={addingServiceTo === cat.id}
          onAddSave={(s) => saveService(s, true)}
          onAddCancel={() => setAddingServiceTo(null)}
          busy={busy}
        />
      ))}

      {uncategorized.length > 0 && (
        <CategorySection
          key="uncategorized"
          category={{ id: 'uncategorized', name: 'Uncategorized', sort_order: 9999 }}
          services={uncategorized}
          canManage={canManage}
          onDelete={() => {}}
          deletable={false}
          onAddService={() => {}}
          editingId={editingService?.id ?? null}
          onEdit={(s) => setEditingService(s)}
          onCancelEdit={() => setEditingService(null)}
          onSave={(s) => saveService(s, false)}
          onDeleteService={deleteService}
          isAdding={false}
          onAddSave={() => {}}
          onAddCancel={() => {}}
          busy={busy}
        />
      )}

      {templateOpen && (
        <TemplatePicker onPick={cloneTemplate} onClose={() => setTemplateOpen(false)} busy={busy} />
      )}
    </div>
  );
}

function CategorySection({
  category, services, canManage, deletable = true, onDelete, onAddService,
  editingId, onEdit, onCancelEdit, onSave, onDeleteService,
  isAdding, onAddSave, onAddCancel, busy,
}: {
  category: Category;
  services: Service[];
  canManage: boolean;
  deletable?: boolean;
  onDelete: () => void;
  onAddService: () => void;
  editingId: string | null;
  onEdit: (s: Service) => void;
  onCancelEdit: () => void;
  onSave: (s: Service) => void;
  onDeleteService: (id: string) => void;
  isAdding: boolean;
  onAddSave: (s: Service) => void;
  onAddCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{category.name}</h2>
        {canManage && (
          <div className="flex items-center gap-3">
            <button onClick={onAddService} className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              + Service
            </button>
            {deletable && (
              <button onClick={onDelete} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
            )}
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {services.length === 0 && !isAdding ? (
          <p className="px-4 py-5 text-center text-sm text-slate-500">No services in this category.</p>
        ) : services.map((s) =>
          editingId === s.id ? (
            <ServiceForm
              key={s.id}
              initial={s}
              onSave={onSave}
              onCancel={onCancelEdit}
              busy={busy}
            />
          ) : (
            <div key={s.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                {s.description && <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  {s.duration_min} min · {formatPrice(s.price_cents, s.price_type)}
                  {!s.is_active && <span className="ml-2 text-amber-600">(hidden)</span>}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => onEdit(s)} className="text-xs font-medium text-amber-600 hover:text-amber-700">Edit</button>
                  <button onClick={() => onDeleteService(s.id)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
                </div>
              )}
            </div>
          )
        )}
        {isAdding && (
          <ServiceForm
            initial={{
              id: '', name: '', description: '', category_id: category.id,
              duration_min: 30, price_cents: null, price_type: 'fixed',
              is_active: true, sort_order: services.length,
            }}
            onSave={onAddSave}
            onCancel={onAddCancel}
            busy={busy}
          />
        )}
      </div>
    </div>
  );
}

function InlineCategoryForm({ onCancel, onSubmit, busy }: { onCancel: () => void; onSubmit: (name: string) => void; busy: boolean }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name (e.g. Color)"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <button
        onClick={() => name.trim() && onSubmit(name.trim())}
        disabled={busy || !name.trim()}
        className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Add
      </button>
      <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
    </div>
  );
}

function ServiceForm({
  initial, onSave, onCancel, busy,
}: { initial: Service; onSave: (s: Service) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
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
      duration_min: duration,
      price_cents: Number.isFinite(cents as number) ? cents : null,
      price_type: priceType,
      is_active: isActive,
    });
  }

  return (
    <div className="space-y-3 bg-slate-50 px-4 py-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Service name"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Description (optional)"
        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-slate-600">
          <span className="block mb-1 font-medium">Duration (min)</span>
          <input
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          <span className="block mb-1 font-medium">Price ($)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="empty = quote"
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          <span className="block mb-1 font-medium">Type</span>
          <select
            value={priceType}
            onChange={(e) => setPriceType(e.target.value as 'fixed' | 'from')}
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
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
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function TemplatePicker({ onPick, onClose, busy }: { onPick: (key: string) => void; onClose: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Pick a starter template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Adds the template&apos;s categories and services to your existing catalog. You can edit or delete anything afterward.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SERVICE_TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              disabled={busy}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm disabled:opacity-50"
            >
              <p className="text-sm font-bold text-slate-900">{t.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t.blurb}</p>
              <p className="mt-2 text-[11px] text-slate-400">
                {t.categories.length} categor{t.categories.length === 1 ? 'y' : 'ies'} · {t.categories.reduce((s, c) => s + c.services.length, 0)} services
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
