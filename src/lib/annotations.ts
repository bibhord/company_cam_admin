/**
 * Annotation shape model. Coordinates are stored in NATURAL image pixel space
 * (e.g. 4032x3024 for a typical phone photo). When rendering, scale the canvas
 * to the displayed image size.
 */

export type AnnotationColor = '#ef4444' | '#f59e0b' | '#10b981' | '#3b82f6' | '#ffffff';

export const ANNOTATION_COLORS: AnnotationColor[] = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ffffff',
];

export type Shape =
  | { id: string; type: 'pen'; points: number[]; color: AnnotationColor; strokeWidth: number }
  | { id: string; type: 'arrow'; from: [number, number]; to: [number, number]; color: AnnotationColor; strokeWidth: number }
  | { id: string; type: 'rect'; x: number; y: number; width: number; height: number; color: AnnotationColor; strokeWidth: number }
  | { id: string; type: 'text'; x: number; y: number; text: string; color: AnnotationColor; fontSize: number };

export interface AnnotationDoc {
  version: 1;
  shapes: Shape[];
}

export const EMPTY_DOC: AnnotationDoc = { version: 1, shapes: [] };

export function isValidDoc(value: unknown): value is AnnotationDoc {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.version === 1 && Array.isArray(v.shapes);
}
