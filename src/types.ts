import type { CMSLocaleKey } from './lib/cmsLocaleTypes';

/** Translated villa copy stored under `localeStrings[fr|he|el]` (English uses root fields). */
export interface VillaLocaleContent {
  name?: string;
  subtitle?: string;
  description?: string;
  /** Sidebar note on villa detail (replaces inquiry form); year-round comfort, etc. */
  allSeasonsNote?: string;
  specs?: { label: string; value: string }[];
  /** One string per `gallerySections` index (images always from English). */
  gallerySectionTitles?: string[];
}

export interface Villa {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  description: string;
  /** English default; merged with locale JSON + CMS for other languages. */
  allSeasonsNote?: string;
  specs: { label: string; value: string }[];
  // Legacy single gallery array (kept for backwards compatibility)
  gallery?: string[];
  // New multi-section gallery model (used by villa pages and admin)
  gallerySections?: { title: string; images: string[] }[];
  /** CMS translations edited in Admin; merged on the public site when locale matches. */
  localeStrings?: Partial<Record<CMSLocaleKey, VillaLocaleContent>>;
}

export type { CMSLocaleKey };

export { };

declare global {
  interface Window {
    aistudio?: {
      openSelectKey: () => Promise<void>;
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}
