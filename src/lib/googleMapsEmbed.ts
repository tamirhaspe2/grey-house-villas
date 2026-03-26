/// <reference types="vite/client" />

/**
 * Build an iframe `src` for the footer map.
 * - If `mapEmbedUrl` is set (paste from Google Maps → Share → Embed a map), use it as-is.
 * - Else if `VITE_GOOGLE_MAPS_API_KEY` is set, use Maps Embed API (enable "Maps Embed API" in Google Cloud).
 * - Else fall back to classic `output=embed` (works in many environments; Google may restrict some referrers).
 */
export function buildGoogleMapsEmbedSrc(footer: {
  mapEmbedUrl?: string;
  mapQuery?: string;
}): string | null {
  const embed = footer.mapEmbedUrl?.trim();
  if (embed) return embed;

  if (footer.mapQuery === '') return null;

  const q = footer.mapQuery?.trim();
  const query = q || '38.777438,20.71357';
  const key =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY
      ? String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY).trim()
      : '';

  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&zoom=17`;
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}
