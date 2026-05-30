'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { EMPTY_DOC, type AnnotationColor, type AnnotationDoc, type Shape } from '@/lib/annotations';

function isStubShape(s: Shape): boolean {
  if (s.type === 'pen') return s.points.length <= 2;
  if (s.type === 'arrow') return s.from[0] === s.to[0] && s.from[1] === s.to[1];
  if (s.type === 'rect') return s.width === 0 && s.height === 0;
  return false;
}

const AnnotationCanvas = dynamic(
  () => import('@/components/annotations/annotation-canvas').then((m) => m.AnnotationCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading editor…</div>
    ),
  },
);

type MobileTool = 'pen' | 'arrow';

const MOBILE_COLORS: AnnotationColor[] = ['#ef4444', '#f59e0b', '#3b82f6'];
const SIZES = [4, 8, 16];

interface Props {
  photoId: string;
  imageUrl: string;
  open: boolean;
  onClose: () => void;
}

export function MobileAnnotationModal({ photoId, imageUrl, open, onClose }: Props) {
  const [doc, setDoc] = useState<AnnotationDoc>(EMPTY_DOC);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [tool, setTool] = useState<MobileTool>('pen');
  const [color, setColor] = useState<AnnotationColor>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(8);
  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const historyRef = useRef<AnnotationDoc[]>([EMPTY_DOC]);
  const historyIdxRef = useRef(0);
  // Tracks the last shape's id from the previous onChange so we can tell a
  // stroke continuation (same id, replace tip) from a new stroke (push).
  const currentStrokeIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const lastSavedRef = useRef<AnnotationDoc>(EMPTY_DOC);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (next: AnnotationDoc) => {
    setAutoSaving(true);
    try {
      await fetch(`/api/admin/photos/${photoId}/annotations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next }),
      });
      lastSavedRef.current = next;
      dirtyRef.current = false;
    } catch {
      // Surface failures only on close; transient ones are debounced.
    } finally {
      setAutoSaving(false);
    }
  }, [photoId]);

  const onCanvasChange = (next: AnnotationDoc) => {
    const lastShape = next.shapes[next.shapes.length - 1];
    const nextStrokeId = lastShape?.id ?? null;
    const isNewStroke = nextStrokeId !== currentStrokeIdRef.current;

    // Drop the trailing stub from the *previous* stroke if the user just
    // started a new one (tap with no drag, then drew elsewhere).
    let effective = next;
    if (isNewStroke && next.shapes.length >= 2) {
      const prev = next.shapes[next.shapes.length - 2];
      if (isStubShape(prev)) {
        effective = { ...next, shapes: [...next.shapes.slice(0, -2), next.shapes[next.shapes.length - 1]] };
      }
    }

    setDoc(effective);
    dirtyRef.current = true;

    const baseIdx = historyIdxRef.current;
    let newHistory: AnnotationDoc[];
    let newIdx: number;
    if (isNewStroke) {
      // New shape — append a new history entry (and drop any redo branch).
      const trimmed = historyRef.current.slice(0, baseIdx + 1);
      newHistory = [...trimmed, effective];
      newIdx = newHistory.length - 1;
    } else {
      // Same stroke being extended — replace the tip in place so an Undo
      // reverts the whole stroke, not point-by-point.
      newHistory = [...historyRef.current.slice(0, baseIdx), effective];
      newIdx = baseIdx;
    }

    historyRef.current = newHistory;
    historyIdxRef.current = newIdx;
    currentStrokeIdRef.current = nextStrokeId;
    setHistoryIdx(newIdx);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void persist(effective); }, 1200);
  };

  const undo = () => {
    if (historyIdxRef.current <= 0) return;
    const i = historyIdxRef.current - 1;
    historyIdxRef.current = i;
    currentStrokeIdRef.current = null; // next change starts a fresh stroke
    const target = historyRef.current[i];
    setDoc(target);
    setHistoryIdx(i);
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void persist(target); }, 1200);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    dirtyRef.current = false;
    fetch(`/api/admin/photos/${photoId}/annotations`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const loaded = res.data ?? EMPTY_DOC;
        setDoc(loaded);
        lastSavedRef.current = loaded;
        historyRef.current = [loaded];
        historyIdxRef.current = 0;
        currentStrokeIdRef.current = null;
        setHistoryIdx(0);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [photoId, open]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleClose = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (dirtyRef.current) {
      await persist(doc);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          onClick={undo}
          disabled={historyIdx <= 0}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 transition active:bg-slate-800 disabled:opacity-40"
        >
          Undo
        </button>
        <span className="text-xs text-slate-400">{autoSaving ? 'Saving…' : 'Saved'}</span>
        <button
          onClick={handleClose}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white transition active:bg-amber-600"
        >
          Done
        </button>
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
            onChange={onCanvasChange}
            onSelect={() => {}}
            selectedId={null}
            pinchZoom
          />
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-slate-800 bg-slate-900 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {/* Tools */}
        <div className="flex items-center justify-center gap-2">
          <ToolBtn label="Pen" active={tool === 'pen'} onClick={() => setTool('pen')} />
          <ToolBtn label="Arrow" active={tool === 'arrow'} onClick={() => setTool('arrow')} />
        </div>

        {/* Colors + sizes */}
        <div className="mt-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            {MOBILE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-9 w-9 rounded-full border-2 transition ${color === c ? 'border-white' : 'border-slate-700'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setStrokeWidth(s)}
                aria-label={`Stroke ${s}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${strokeWidth === s ? 'border-white bg-slate-800' : 'border-slate-700'}`}
              >
                <span
                  className="block rounded-full bg-white"
                  style={{ width: s, height: s }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`min-w-[88px] rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
