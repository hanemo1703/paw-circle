// Forward geocoding via Nominatim (same free/no-key provider already used for
// reverse geocoding client-side in the post-creation location picker). Best-effort
// only: any failure, timeout, or empty result yields `null` rather than throwing,
// since a missing pin should never block creating/editing a post.

// Nominatim's usage policy caps clients at ~1 request/sec — serialize all calls
// through this promise chain so bursts (e.g. batch backfill) don't exceed that.
let throttleChain: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  const next = throttleChain.then(() => new Promise<void>((resolve) => setTimeout(resolve, 1100)));
  throttleChain = next;
  return next;
}

export async function forwardGeocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || !address.trim()) return null;

  await throttle();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      `${address}, Vietnam`,
    )}&limit=1&countrycodes=vn`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PawCircle/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const results = (await res.json()) as { lat: string; lon: string }[];
    if (!results || results.length === 0) return null;

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
