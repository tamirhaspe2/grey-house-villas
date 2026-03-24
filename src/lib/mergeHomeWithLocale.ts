/** Merges translated home copy over API/CMS data for non-English locales. English uses API data as-is. */

export interface HomeContentShape {
  hero: Record<string, string | undefined>;
  philosophy: Record<string, string | undefined>;
  interior: Record<string, unknown>;
  gallery: Record<string, unknown>;
  residences: Record<string, string | undefined>;
  footer?: Record<string, unknown>;
}

export function mergeHomeWithLocale<T extends HomeContentShape>(
  api: T,
  lng: string,
  overlay: { home?: Partial<T> } | undefined
): T {
  if (lng === 'en' || !overlay?.home) return api;
  const h = overlay.home;
  const int = h.interior as T['interior'] | undefined;
  const intApi = api.interior as { features?: string[] };
  const intOv = int as { features?: string[] } | undefined;
  return {
    ...api,
    hero: { ...api.hero, ...h.hero },
    philosophy: { ...api.philosophy, ...h.philosophy },
    interior: {
      ...api.interior,
      ...int,
      features: intOv?.features ?? intApi.features,
    } as T['interior'],
    gallery: { ...api.gallery, ...h.gallery } as T['gallery'],
    residences: { ...api.residences, ...h.residences },
    footer: api.footer && h.footer ? { ...(api.footer as object), ...(h.footer as object) } : api.footer,
  };
}
