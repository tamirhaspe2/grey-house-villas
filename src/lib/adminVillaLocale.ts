import type { Villa, VillaLocaleContent } from '../types';
import type { AdminContentLocale, CMSLocaleKey } from './cmsLocaleTypes';

const CMS_LOCALES: CMSLocaleKey[] = ['fr', 'he', 'el'];

export function readVillaSubtitle(v: Villa, loc: AdminContentLocale): string {
  if (loc === 'en') return v.subtitle;
  return v.localeStrings?.[loc]?.subtitle ?? '';
}

export function readVillaDescription(v: Villa, loc: AdminContentLocale): string {
  if (loc === 'en') return v.description;
  return v.localeStrings?.[loc]?.description ?? '';
}

export function readVillaName(v: Villa, loc: AdminContentLocale): string {
  if (loc === 'en') return v.name;
  return v.localeStrings?.[loc]?.name ?? '';
}

export function writeVillaSubtitle(
  villas: Villa[],
  activeId: string,
  loc: AdminContentLocale,
  text: string
): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    if (loc === 'en') return { ...v, subtitle: text };
    return {
      ...v,
      localeStrings: {
        ...v.localeStrings,
        [loc]: { ...v.localeStrings?.[loc], subtitle: text },
      },
    };
  });
}

export function writeVillaDescription(
  villas: Villa[],
  activeId: string,
  loc: AdminContentLocale,
  text: string
): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    if (loc === 'en') return { ...v, description: text };
    return {
      ...v,
      localeStrings: {
        ...v.localeStrings,
        [loc]: { ...v.localeStrings?.[loc], description: text },
      },
    };
  });
}

export function writeVillaName(
  villas: Villa[],
  activeId: string,
  loc: AdminContentLocale,
  text: string
): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    if (loc === 'en') return { ...v, name: text };
    return {
      ...v,
      localeStrings: {
        ...v.localeStrings,
        [loc]: { ...v.localeStrings?.[loc], name: text },
      },
    };
  });
}

export function readVillaSpec(
  v: Villa,
  loc: AdminContentLocale,
  specIdx: number
): { label: string; value: string } {
  const base = v.specs[specIdx] || { label: '', value: '' };
  if (loc === 'en') return base;
  const o = v.localeStrings?.[loc]?.specs?.[specIdx];
  return { label: o?.label ?? '', value: o?.value ?? '' };
}

export function writeVillaSpecField(
  villas: Villa[],
  activeId: string,
  loc: AdminContentLocale,
  specIdx: number,
  field: 'label' | 'value',
  text: string
): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    if (loc === 'en') {
      const specs = [...v.specs];
      specs[specIdx] = { ...specs[specIdx], [field]: text };
      return { ...v, specs };
    }
    const slot: VillaLocaleContent = { ...v.localeStrings?.[loc as CMSLocaleKey] };
    const specs = [...(slot.specs || [])];
    while (specs.length <= specIdx) specs.push({ label: '', value: '' });
    specs[specIdx] = { ...specs[specIdx], [field]: text };
    slot.specs = specs;
    return {
      ...v,
      localeStrings: { ...v.localeStrings, [loc as CMSLocaleKey]: slot },
    };
  });
}

export function removeVillaSpec(villas: Villa[], activeId: string, specIdx: number): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    const specs = v.specs.filter((_, i) => i !== specIdx);
    const nextLs = { ...v.localeStrings };
    for (const k of CMS_LOCALES) {
      const s = nextLs[k]?.specs;
      if (!s) continue;
      const ns = s.filter((_, i) => i !== specIdx);
      nextLs[k] = { ...nextLs[k], specs: ns };
    }
    return { ...v, specs, localeStrings: nextLs };
  });
}

export function addVillaSpec(villas: Villa[], activeId: string): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    const specs = [...v.specs, { label: '', value: '' }];
    return { ...v, specs };
  });
}

export function readVillaGalleryTitle(
  v: Villa,
  loc: AdminContentLocale,
  sectionIdx: number
): string {
  if (loc === 'en') {
    return (v.gallerySections?.[sectionIdx]?.title as string) ?? '';
  }
  const t = v.localeStrings?.[loc]?.gallerySectionTitles?.[sectionIdx];
  return t ?? '';
}

/** After removing an accordion in English, drop the same index from every locale’s `gallerySectionTitles`. */
export function removeVillaGallerySection(villas: Villa[], activeId: string, sectionIdx: number): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    const sections = [...(v.gallerySections || [])];
    sections.splice(sectionIdx, 1);
    const gallerySections = sections.length ? sections : [{ title: 'Visual Details.', images: [] as string[] }];
    const nextLs = { ...v.localeStrings };
    for (const k of CMS_LOCALES) {
      const slot = { ...nextLs[k] };
      const titles = [...(slot.gallerySectionTitles || [])];
      if (titles.length > sectionIdx) titles.splice(sectionIdx, 1);
      slot.gallerySectionTitles = titles;
      nextLs[k] = slot;
    }
    return { ...v, gallerySections, localeStrings: nextLs };
  });
}

export function writeVillaGalleryTitle(
  villas: Villa[],
  activeId: string,
  loc: AdminContentLocale,
  sectionIdx: number,
  text: string
): Villa[] {
  return villas.map((v) => {
    if (v.id !== activeId) return v;
    if (loc === 'en') {
      const sections = [...(v.gallerySections || [])];
      if (!sections[sectionIdx]) return v;
      sections[sectionIdx] = { ...sections[sectionIdx], title: text };
      return { ...v, gallerySections: sections };
    }
    const slot: VillaLocaleContent = { ...v.localeStrings?.[loc as CMSLocaleKey] };
    const titles = [...(slot.gallerySectionTitles || [])];
    while (titles.length <= sectionIdx) titles.push('');
    titles[sectionIdx] = text;
    slot.gallerySectionTitles = titles;
    return {
      ...v,
      localeStrings: { ...v.localeStrings, [loc as CMSLocaleKey]: slot },
    };
  });
}
