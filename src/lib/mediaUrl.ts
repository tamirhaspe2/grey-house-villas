/**
 * Encode each path segment so filenames with spaces (e.g. WhatsApp exports) work on iOS Safari
 * and other strict clients. Leaves http(s)/blob/data URLs unchanged.
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

  const encoded =
    pathname
      .split('/')
      .map((seg) => (seg === '' ? '' : encodeURIComponent(seg)))
      .join('/') + query;

  return encoded + hash;
}
