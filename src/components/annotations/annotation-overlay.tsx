/**
 * Read-only SVG overlay that renders annotation shapes positioned in natural
 * image coordinates. Place this as a sibling to the <img> with absolute
 * positioning so it covers the same area.
 */

import type { AnnotationDoc, Shape } from '@/lib/annotations';

interface Props {
  doc: AnnotationDoc;
  naturalWidth: number;
  naturalHeight: number;
  className?: string;
}

export function AnnotationOverlay({ doc, naturalWidth, naturalHeight, className }: Props) {
  if (!doc.shapes.length) return null;
  return (
    <svg
      viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
      preserveAspectRatio="none"
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
    >
      {doc.shapes.map((shape) => (
        <ShapeNode key={shape.id} shape={shape} />
      ))}
    </svg>
  );
}

function ShapeNode({ shape }: { shape: Shape }) {
  switch (shape.type) {
    case 'pen': {
      const d = pointsToPath(shape.points);
      return <path d={d} stroke={shape.color} strokeWidth={shape.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    }
    case 'arrow': {
      const [x1, y1] = shape.from;
      const [x2, y2] = shape.to;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = shape.strokeWidth * 6;
      const h1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
      const h1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
      const h2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
      const h2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
      return (
        <g>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={shape.color} strokeWidth={shape.strokeWidth} strokeLinecap="round" />
          <polyline points={`${h1x},${h1y} ${x2},${y2} ${h2x},${h2y}`} fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
    case 'rect':
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={shape.color} strokeWidth={shape.strokeWidth} fill="none" />;
    case 'text':
      return (
        <text x={shape.x} y={shape.y} fill={shape.color} fontSize={shape.fontSize} fontFamily="system-ui, sans-serif" dominantBaseline="hanging">
          {shape.text}
        </text>
      );
  }
}

function pointsToPath(points: number[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) {
    d += ` L ${points[i]} ${points[i + 1]}`;
  }
  return d;
}
