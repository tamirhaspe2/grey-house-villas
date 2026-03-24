/** Locales stored in CMS (home.json / villas.json) — English lives on the root object. */
export type CMSLocaleKey = 'fr' | 'he' | 'el';

export type AdminContentLocale = 'en' | CMSLocaleKey;

export const ADMIN_CONTENT_LOCALE_OPTIONS: { value: AdminContentLocale; label: string }[] = [
  { value: 'en', label: 'English (default)' },
  { value: 'fr', label: 'Français' },
  { value: 'he', label: 'עברית' },
  { value: 'el', label: 'Ελληνικά' },
];
