'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ANNOTATION_COLORS, EMPTY_DOC, type AnnotationColor, type AnnotationDoc } from '@/lib/annotations';
import type { Tool } from './annotation-canvas';

// Konva touches `window` on import — load only on the client.
const AnnotationCanvas = dynamic(() => import('./annotation-canvas').then((m) => m.AnnotationCanvas), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading editor…</div>,
});

interface Props {
  photoId: string;
  imageUrl: string;
  open: boolean;
  onClose: () => void;
}

export function AnnotationModal({ photoId, imageUrl, open, onClose }: Props) {
  const [doc, setDoc] = useState<AnnotationDoc>(EMPTY_DOC);
  const [history, setHistory] = useState<AnnotationDoc[]>([EMPTY_DOC]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<AnnotationColor>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const initialDocRef = useRef<AnnotationDoc>(EMPTY_DOC);

  const setDocAndPush = useCallback((next: AnnotationDoc, fromHistory = false) => {
    setDoc(next);
    if (!fromHistory) {
      setDirty(true);
      setHistory((h) => {
        const trimmed = h.slice(0, historyIdx + 1);
        return [...trimmed, next];
      });
      setHistoryIdx((i) => i + 1);
    }
  }, [historyIdx]);

  // Load existing annotations
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setDirty(false);
    fetch(`/api/admin/photos/${photoId}/annotations`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const loaded = res.data ?? EMPTY_DOC;
        setDoc(loaded);
        initialDocRef.current = loaded;
        setHistory([loaded]);
        setHistoryIdx(0);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [photoId, open]);

  // Escape to close (with confirmation if dirty)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId) { e.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const undo = () => {
    if (historyIdx <= 0) return;
    const i = historyIdx - 1;
    setHistoryIdx(i);
    setDocAndPush(history[i], true);
    setDirty(true);
  };
  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const i = historyIdx + 1;
    setHistoryIdx(i);
    setDocAndPush(history[i], true);
    setDirty(true);
  };
  const deleteSelected = () => {
    if (!selectedId) return;
    setDocAndPush({ ...doc, shapes: doc.shapes.filter((s) => s.id !== selectedId) });
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/photos/${photoId}/annotations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: doc }),
      });
      if (!res.ok) throw new Error('Failed to save');
      initialDocRef.current = doc;
      setDirty(false);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirty && !window.confirm('Discard unsaved annotations?')) return;
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/95 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
        <ToolBtn label="Pen" active={tool === 'pen'} onClick={() => setTool('pen')} />
        <ToolBtn label="Arrow" active={tool === 'arrow'} onClick={() => setTool('arrow')} />
        <ToolBtn label="Rect" active={tool === 'rect'} onClick={() => setTool('rect')} />
        <ToolBtn label="Text" active={tool === 'text'} onClick={() => setTool('text')} />
        <ToolBtn label="Select" active={tool === 'select'} onClick={() => setTool('select')} />

        <div className="mx-2 h-6 w-px bg-slate-700" />

        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-amber-400' : 'border-slate-700'}`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}

        <div className="mx-2 h-6 w-px bg-slate-700" />

        <label className="flex items-center gap-2 text-xs text-slate-400">
          Size
          <input
            type="range"
            min={2}
            max={32}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
            className="w-24"
          />
        </label>

        <div className="mx-2 h-6 w-px bg-slate-700" />

        <ToolBtn label="Undo" disabled={historyIdx <= 0} onClick={undo} />
        <ToolBtn label="Redo" disabled={historyIdx >= history.length - 1} onClick={redo} />
        <ToolBtn label="Delete" disabled={!selectedId} onClick={deleteSelected} />

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleClose} className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : (
          <AnnotationCanvas
            imageUrl={imageUrl}
            doc={doc}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            onChange={(d) => setDocAndPush(d)}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        )}
      </div>
    </div>
  );
}

function ToolBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
        active ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-slate-800'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );
}
