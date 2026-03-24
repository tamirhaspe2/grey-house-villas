import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import he from './locales/he.json';
import el from './locales/el.json';

export const LOCALE_STORAGE_KEY = 'greyhouse-locale';
export const SUPPORTED_LOCALES = ['en', 'he', 'fr', 'el'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Sync `<html lang dir>` with public locale (Admin forces LTR and restores this on unmount). */
export function applyDocumentLang(lng: string) {
  const html = document.documentElement;
  html.lang = lng === 'he' ? 'he' : lng === 'fr' ? 'fr' : lng === 'el' ? 'el' : 'en';
  html.dir = lng === 'he' ? 'rtl' : 'ltr';
}

const stored =
  typeof localStorage !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
const initialLng =
  stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale) ? stored : 'en';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    he: { translation: he },
    el: { translation: el },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDocumentLang(initialLng);

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  } catch {
    /* private mode */
  }
  applyDocumentLang(lng);
});

export default i18n;
