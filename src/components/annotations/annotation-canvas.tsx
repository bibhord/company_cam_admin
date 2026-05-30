'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Text, Arrow, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { AnnotationColor, AnnotationDoc, Shape } from '@/lib/annotations';

export type Tool = 'pen' | 'arrow' | 'rect' | 'text' | 'select';

interface Props {
  imageUrl: string;
  doc: AnnotationDoc;
  tool: Tool;
  color: AnnotationColor;
  strokeWidth: number;
  onChange: (doc: AnnotationDoc) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  /** Enable two-finger pinch-to-zoom + pan on the stage. */
  pinchZoom?: boolean;
}

export function AnnotationCanvas({ imageUrl, doc, tool, color, strokeWidth, onChange, onSelect, selectedId, pinchZoom = false }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const pinchRef = useRef<{ dist: number; centerX: number; centerY: number; startScale: number; startX: number; startY: number } | null>(null);

  // Load the image into a HTMLImageElement so Konva can render it.
  // We do NOT set crossOrigin because Capacitor's WKWebView image loads
  // can fail CORS even when the same URL works in the regular browser.
  // The canvas becomes "tainted", which is fine — we only persist `doc`
  // (the shape model) and never export the rendered canvas.
  useEffect(() => {
    const el = new window.Image();
    el.src = imageUrl;
    el.onload = () => setImg(el);
    el.onerror = () => console.error('annotation image failed to load', imageUrl);
  }, [imageUrl]);

  // Fit stage to container while preserving image aspect ratio.
  useEffect(() => {
    if (!img || !containerRef.current) return;
    const update = () => {
      const cw = containerRef.current!.clientWidth;
      const ch = containerRef.current!.clientHeight;
      const ar = img.naturalWidth / img.naturalHeight;
      let w = cw, h = cw / ar;
      if (h > ch) { h = ch; w = ch * ar; }
      setStageSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [img]);

  const scale = img ? stageSize.width / img.naturalWidth : 1;

  // Convert stage coords -> natural image coords for storage.
  const toNatural = (pt: { x: number; y: number }) => ({ x: pt.x / scale, y: pt.y / scale });

  // Two-finger pinch start: lock drawing, record initial gesture state.
  const handleTouchStartGesture = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!pinchZoom) return false;
    const touches = e.evt.touches;
    if (touches.length !== 2) return false;
    isDrawing.current = false;
    if (doc.shapes.length > 0) {
      const last = doc.shapes[doc.shapes.length - 1];
      const isStub =
        (last.type === 'pen' && last.points.length <= 2) ||
        (last.type === 'arrow' && last.from[0] === last.to[0] && last.from[1] === last.to[1]) ||
        (last.type === 'rect' && last.width === 0 && last.height === 0);
      if (isStub) onChange({ ...doc, shapes: doc.shapes.slice(0, -1) });
    }
    const [a, b] = [touches[0], touches[1]];
    pinchRef.current = {
      dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
      centerX: (a.clientX + b.clientX) / 2,
      centerY: (a.clientY + b.clientY) / 2,
      startScale: zoom.scale,
      startX: zoom.x,
      startY: zoom.y,
    };
    return true;
  };

  const handleTouchMoveGesture = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!pinchZoom || !pinchRef.current) return false;
    const touches = e.evt.touches;
    if (touches.length !== 2) return false;
    const [a, b] = [touches[0], touches[1]];
    const newDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const ratio = newDist / pinchRef.current.dist;
    const nextScale = Math.min(5, Math.max(1, pinchRef.current.startScale * ratio));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return true;
    const cx = pinchRef.current.centerX - rect.left;
    const cy = pinchRef.current.centerY - rect.top;
    const nextX = cx - (cx - pinchRef.current.startX) * (nextScale / pinchRef.current.startScale);
    const nextY = cy - (cy - pinchRef.current.startY) * (nextScale / pinchRef.current.startScale);
    setZoom({ scale: nextScale, x: nextX, y: nextY });
    return true;
  };

  const handleTouchEndGesture = () => {
    if (pinchRef.current) {
      pinchRef.current = null;
      return true;
    }
    return false;
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (handleTouchStartGesture(e as Konva.KonvaEventObject<TouchEvent>)) return;
    if (!img) return;
    if (tool === 'select') {
      const clicked = e.target;
      if (clicked === e.target.getStage() || clicked.attrs.name === 'background') {
        onSelect(null);
      }
      return;
    }
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    const np = toNatural(pos);
    const id = crypto.randomUUID();
    isDrawing.current = true;

    if (tool === 'pen') {
      onChange({ ...doc, shapes: [...doc.shapes, { id, type: 'pen', points: [np.x, np.y], color, strokeWidth }] });
    } else if (tool === 'arrow') {
      onChange({ ...doc, shapes: [...doc.shapes, { id, type: 'arrow', from: [np.x, np.y], to: [np.x, np.y], color, strokeWidth }] });
    } else if (tool === 'rect') {
      onChange({ ...doc, shapes: [...doc.shapes, { id, type: 'rect', x: np.x, y: np.y, width: 0, height: 0, color, strokeWidth }] });
    } else if (tool === 'text') {
      const text = window.prompt('Text label:', '');
      isDrawing.current = false;
      if (text) {
        onChange({ ...doc, shapes: [...doc.shapes, { id, type: 'text', x: np.x, y: np.y, text, color, fontSize: 32 }] });
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (handleTouchMoveGesture(e as Konva.KonvaEventObject<TouchEvent>)) return;
    if (!isDrawing.current || tool === 'select' || tool === 'text') return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const np = toNatural(pos);
    const last = doc.shapes[doc.shapes.length - 1];
    if (!last) return;
    let updated: Shape = last;
    if (last.type === 'pen') {
      updated = { ...last, points: [...last.points, np.x, np.y] };
    } else if (last.type === 'arrow') {
      updated = { ...last, to: [np.x, np.y] };
    } else if (last.type === 'rect') {
      updated = { ...last, width: np.x - last.x, height: np.y - last.y };
    }
    onChange({ ...doc, shapes: [...doc.shapes.slice(0, -1), updated] });
  };

  const handleMouseUp = () => {
    if (handleTouchEndGesture()) return;
    isDrawing.current = false;
  };

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      {img && stageSize.width > 0 && (
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scaleX={zoom.scale}
          scaleY={zoom.scale}
          x={zoom.x}
          y={zoom.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
        >
          <Layer>
            <KonvaImage image={img} width={stageSize.width} height={stageSize.height} name="background" listening={tool === 'select'} />
            {doc.shapes.map((s) => (
              <ShapeRenderer
                key={s.id}
                shape={s}
                scale={scale}
                selected={s.id === selectedId}
                selectable={tool === 'select'}
                onClick={() => tool === 'select' && onSelect(s.id)}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function ShapeRenderer({ shape, scale, selected, selectable, onClick }: { shape: Shape; scale: number; selected: boolean; selectable: boolean; onClick: () => void }) {
  const stroke = selected ? '#fbbf24' : shape.color;
  const common = {
    onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (selectable) {
        e.cancelBubble = true;
        onClick();
      }
    },
  };
  if (shape.type === 'pen') {
    const pts = shape.points.map((v) => v * scale);
    return <Line {...common} points={pts} stroke={stroke} strokeWidth={shape.strokeWidth * scale} lineCap="round" lineJoin="round" tension={0.4} />;
  }
  if (shape.type === 'arrow') {
    return (
      <Arrow
        {...common}
        points={[shape.from[0] * scale, shape.from[1] * scale, shape.to[0] * scale, shape.to[1] * scale]}
        stroke={stroke}
        fill={stroke}
        strokeWidth={shape.strokeWidth * scale}
        pointerLength={shape.strokeWidth * 5 * scale}
        pointerWidth={shape.strokeWidth * 4 * scale}
      />
    );
  }
  if (shape.type === 'rect') {
    return (
      <Rect
        {...common}
        x={shape.x * scale}
        y={shape.y * scale}
        width={shape.width * scale}
        height={shape.height * scale}
        stroke={stroke}
        strokeWidth={shape.strokeWidth * scale}
      />
    );
  }
  return (
    <Text
      {...common}
      x={shape.x * scale}
      y={shape.y * scale}
      text={shape.text}
      fontSize={shape.fontSize * scale}
      fill={stroke}
    />
  );
}
