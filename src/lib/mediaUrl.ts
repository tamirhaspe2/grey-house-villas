/**
 * Encode path segments only when the path still has raw spaces (e.g. WhatsApp filenames).
 * If the URL is already percent-encoded (%20), return as-is — double-encoding breaks iOS Safari.
 */
export function encodePublicMediaUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;

  const hashIdx = trimmed.indexOf('#');
  const base = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : '';

  const qIdx = base.indexOf('?');
  const pathname = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const query = qIdx >= 0 ? base.slice(qIdx) : '';

  const hasRawSpace = pathname.split('/').some((seg) => /[ \t\n\r]/.test(seg));
  if (!hasRawSpace) return trimmed;

  const encoded =
    pathname
      .split('/')
      .map((seg) => (seg === '' ? '' : encodeURIComponent(seg)))
      .join('/') + query;

  return encoded + hash;
}
