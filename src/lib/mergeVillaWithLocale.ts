import type { Villa } from '../types';
import i18n from '../i18n';

/**
 * CMS/API villa copy is authored in English. For fr/he/el, merge translated fields from
 * `locales/*.json` under `villas.<villaId>` (same pattern as `mergeHomeWithLocale`).
 */
export type VillaLocaleOverlay = {
  name?: string;
  subtitle?: string;
  description?: string;
  specs?: { label?: string; value?: string }[];
  gallerySections?: { title?: string }[];
};

export function mergeVillaWithLocale(villa: Villa, lng: string): Villa {
  if (lng === 'en') return villa;
  const root = i18n.getResourceBundle(lng, 'translation') as { villas?: Record<string, VillaLocaleOverlay> };
  const ov = root?.villas?.[villa.id];
  if (!ov) return villa;

  const specs = villa.specs.map((s, i) => {
    const o = ov.specs?.[i];
    if (!o) return s;
    return { label: o.label ?? s.label, value: o.value ?? s.value };
  });

  const gallerySections = (villa.gallerySections || []).map((sec, i) => {
    const o = ov.gallerySections?.[i];
    if (o && typeof o.title === 'string') {
      return { ...sec, title: o.title };
    }
    return sec;
  });

  return {
    ...villa,
    name: ov.name ?? villa.name,
    subtitle: ov.subtitle ?? villa.subtitle,
    description: ov.description ?? villa.description,
    specs,
    gallerySections: gallerySections.length > 0 ? gallerySections : villa.gallerySections,
  };
}
