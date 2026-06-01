/** Great-circle distance in meters between two lat/lng pairs (haversine). */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Wraps `navigator.geolocation.getCurrentPosition` in a promise with a
 * sensible default timeout and high-accuracy hint. Resolves to null if
 * the API isn't available, the user denied permission, or the request
 * timed out — callers fall back to manual selection in any of those.
 */
export function getCurrentCoords(timeoutMs = 8000): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}

interface PlaceLike {
  id: string;
  lat?: number | null;
  lng?: number | null;
}

/** Returns the closest place within `maxMeters`, or null if none. */
export function nearestPlace<T extends PlaceLike>(
  places: T[],
  here: Coords,
  maxMeters: number,
): { place: T; distance: number } | null {
  let best: { place: T; distance: number } | null = null;
  for (const p of places) {
    if (p.lat == null || p.lng == null) continue;
    const d = distanceMeters(here.lat, here.lng, p.lat, p.lng);
    if (d > maxMeters) continue;
    if (!best || d < best.distance) best = { place: p, distance: d };
  }
  return best;
}
