/**
 * localStorage-backed cache for the mobile photos list, enabling
 * stale-while-revalidate rendering. Render from cache on mount for instant
 * paint, then fetch fresh in the background and replace.
 *
 * Signed URLs in the cache may be expired; the fresh fetch will replace
 * them shortly after mount, so brief broken thumbnails are acceptable.
 */

const KEY = 'cyw_m_photos_v1';
const MAX_ITEMS = 60;

export function readPhotosCache<T>(): T[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as T[];
  } catch {
    return null;
  }
}

export function writePhotosCache<T>(photos: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = photos.slice(0, MAX_ITEMS);
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Quota errors etc. — best effort, ignore.
  }
}

export function clearPhotosCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
