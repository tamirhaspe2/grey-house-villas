import type { Villa } from '../types';
import type { CMSLocaleKey } from './cmsLocaleTypes';
import i18n from '../i18n';

/**
 * CMS/API villa copy is authored in English. For fr/he/el, merge translated fields from
 * `locales/*.json` under `villas.<villaId>`, then apply Admin-edited `localeStrings[lng]` on top.
 */
export type VillaLocaleOverlay = {
  name?: string;
  subtitle?: string;
  description?: string;
  specs?: { label?: string; value?: string }[];
  gallerySections?: { title?: string }[];
};

function applyJsonOverlay(villa: Villa, lng: string): Villa {
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

function applyCmsLocaleStrings(villa: Villa, lng: string): Villa {
  const key = lng as CMSLocaleKey;
  if (key !== 'fr' && key !== 'he' && key !== 'el') return villa;
  const cms = villa.localeStrings?.[key];
  if (!cms) return villa;

  const specs = villa.specs.map((s, i) => {
    const o = cms.specs?.[i];
    if (!o) return s;
    return {
      label: o.label !== undefined && o.label !== '' ? o.label : s.label,
      value: o.value !== undefined && o.value !== '' ? o.value : s.value,
    };
  });

  const gallerySections = (villa.gallerySections || []).map((sec, i) => {
    const t = cms.gallerySectionTitles?.[i];
    if (typeof t === 'string' && t.trim() !== '') return { ...sec, title: t };
    return sec;
  });

  return {
    ...villa,
    name: cms.name !== undefined && cms.name !== '' ? cms.name : villa.name,
    subtitle: cms.subtitle !== undefined && cms.subtitle !== '' ? cms.subtitle : villa.subtitle,
    description: cms.description !== undefined && cms.description !== '' ? cms.description : villa.description,
    specs,
    gallerySections: gallerySections.length > 0 ? gallerySections : villa.gallerySections,
  };
}

export function mergeVillaWithLocale(villa: Villa, lng: string): Villa {
  if (lng === 'en') return villa;
  const afterJson = applyJsonOverlay(villa, lng);
  return applyCmsLocaleStrings(afterJson, lng);
}
