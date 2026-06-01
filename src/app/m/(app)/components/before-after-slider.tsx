'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  onClose: () => void;
}

/**
 * Full-screen before/after comparison. The "after" image is drawn on top
 * and clipped to a horizontal width controlled by the user's finger.
 */
export function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel, afterLabel, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);

  function updateFromClientX(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const next = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPct(next);
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging.current) return;
      e.preventDefault();
      updateFromClientX(e.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-black">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <span className="text-sm font-medium text-slate-200">Before / After</span>
        <button onClick={onClose} className="rounded-full bg-slate-800 p-2 text-slate-200">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1 select-none touch-none overflow-hidden"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          updateFromClientX(e.clientX);
        }}
      >
        {/* Before — full image at the back */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeUrl} alt={beforeLabel ?? 'Before'} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        {/* After — clipped from the left edge to `pct` */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={afterUrl} alt={afterLabel ?? 'After'} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        </div>
        {/* Divider + handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
          style={{ left: `calc(${pct}% - 1px)` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
            <svg className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 3.75 9l4.5 4.5M15.75 4.5 20.25 9l-4.5 4.5M8.25 19.5l-4.5-4.5 4.5-4.5M15.75 19.5l4.5-4.5-4.5-4.5" />
            </svg>
          </div>
        </div>
        {/* Labels */}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">Before</span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">After</span>
      </div>
    </div>
  );
}
