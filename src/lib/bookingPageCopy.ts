import type { CSSProperties } from 'react';
import type { TFunction } from 'i18next';
import type { BookingPricingConfig } from './bookingPricing';
import type { AdminContentLocale } from './cmsLocaleTypes';

export type BookingUILocale = 'en' | 'fr' | 'he' | 'el';

export type BookingPageFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface BookingPageBlock {
  text?: string;
  fontSizePx?: number;
  color?: string;
  fontWeight?: BookingPageFontWeight;
}

export type BookingPageBlockKey =
  | 'title'
  | 'intro'
  | 'ratesHintBefore'
  | 'ratesHintHighlight'
  | 'ratesHintAfter'
  | 'chooseExperience'
  | 'pkgA_name'
  | 'pkgA_desc'
  | 'pkgA_guests'
  | 'pkgB_name'
  | 'pkgB_desc'
  | 'pkgB_guests'
  | 'pkgC_name'
  | 'pkgC_desc'
  | 'pkgC_guests'
  | 'calendarPrompt'
  | 'legendSelected'
  | 'legendMinStay'
  | 'selectExperienceCalendar'
  | 'policyTitle'
  | 'policyText'
  | 'secureTitle'
  | 'secureText';

export interface BookingPageConfig {
  locales?: Partial<Record<BookingUILocale, Partial<Record<BookingPageBlockKey, BookingPageBlock>>>>;
}

const FONT_WEIGHT_CSS: Record<BookingPageFontWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/** Default typography when CMS omits values (matches previous Tailwind look). */
export const BOOKING_PAGE_DEFAULT_STYLES: Record<BookingPageBlockKey, CSSProperties> = {
  title: { fontSize: 32, color: '#1A202C', fontWeight: 600 },
  intro: { fontSize: 14, color: '#4A5568', fontWeight: 300 },
  ratesHintBefore: { fontSize: 10, color: '#A89F91', fontWeight: 400 },
  ratesHintHighlight: { fontSize: 10, color: '#be123c', fontWeight: 600 },
  ratesHintAfter: { fontSize: 10, color: '#A89F91', fontWeight: 400 },
  chooseExperience: { fontSize: 10, color: '#6B7280', fontWeight: 400 },
  pkgA_name: { fontSize: 16, color: '#1A202C', fontWeight: 400 },
  pkgA_desc: { fontSize: 12, color: '#6B7280', fontWeight: 300 },
  pkgA_guests: { fontSize: 10, color: '#A89F91', fontWeight: 400 },
  pkgB_name: { fontSize: 16, color: '#1A202C', fontWeight: 400 },
  pkgB_desc: { fontSize: 12, color: '#6B7280', fontWeight: 300 },
  pkgB_guests: { fontSize: 10, color: '#A89F91', fontWeight: 400 },
  pkgC_name: { fontSize: 16, color: '#1A202C', fontWeight: 400 },
  pkgC_desc: { fontSize: 12, color: '#6B7280', fontWeight: 300 },
  pkgC_guests: { fontSize: 10, color: '#A89F91', fontWeight: 400 },
  calendarPrompt: { fontSize: 14, color: '#6B7280', fontWeight: 400 },
  legendSelected: { fontSize: 12, color: '#6B7280', fontWeight: 400 },
  legendMinStay: { fontSize: 12, color: '#991b1b', fontWeight: 400 },
  selectExperienceCalendar: { fontSize: 12, color: '#6B7280', fontWeight: 400 },
  policyTitle: { fontSize: 16, color: '#1A202C', fontWeight: 400 },
  policyText: { fontSize: 12, color: '#6B7280', fontWeight: 400 },
  secureTitle: { fontSize: 16, color: '#1A202C', fontWeight: 400 },
  secureText: { fontSize: 12, color: '#6B7280', fontWeight: 400 },
};

/** i18n key under `booking.*`, or null when the value is hardcoded in the app. */
export const BOOKING_PAGE_BLOCK_I18N: Record<BookingPageBlockKey, string | null> = {
  title: 'booking.title',
  intro: 'booking.intro',
  ratesHintBefore: 'booking.ratesHintBefore',
  ratesHintHighlight: 'booking.ratesHintRed',
  ratesHintAfter: 'booking.ratesHintAfter',
  chooseExperience: 'booking.chooseExperience',
  pkgA_name: null,
  pkgA_desc: 'booking.pkgA_desc',
  pkgA_guests: 'booking.pkgA_guests',
  pkgB_name: null,
  pkgB_desc: 'booking.pkgB_desc',
  pkgB_guests: 'booking.pkgB_guests',
  pkgC_name: null,
  pkgC_desc: 'booking.pkgC_desc',
  pkgC_guests: 'booking.pkgC_guests',
  calendarPrompt: 'booking.calendarPrompt',
  legendSelected: 'booking.legendSelected',
  legendMinStay: 'booking.legendMinStay',
  selectExperienceCalendar: 'booking.selectExperienceCalendar',
  policyTitle: 'booking.policyTitle',
  policyText: 'booking.policyText',
  secureTitle: 'booking.secureTitle',
  secureText: 'booking.secureText',
};

const HARDCODED_NAME: Partial<Record<BookingPageBlockKey, string>> = {
  pkgA_name: 'Oneiro',
  pkgB_name: 'Villa Pétra',
  pkgC_name: 'Grey Estate',
};

function normLang(lng: string): BookingUILocale {
  const l = lng.split('-')[0];
  if (l === 'fr' || l === 'he' || l === 'el') return l;
  return 'en';
}

function blockFromConfig(
  cfg: BookingPricingConfig | undefined,
  lang: string,
  key: BookingPageBlockKey
): BookingPageBlock | undefined {
  const loc = normLang(lang);
  return cfg?.bookingPage?.locales?.[loc]?.[key];
}

export function bookingPageBlockStyle(
  key: BookingPageBlockKey,
  cfg: BookingPricingConfig | undefined,
  lang: string
): CSSProperties {
  const b = blockFromConfig(cfg, lang, key);
  const d = BOOKING_PAGE_DEFAULT_STYLES[key];
  const w = b?.fontWeight ? FONT_WEIGHT_CSS[b.fontWeight] : undefined;
  return {
    ...d,
    ...(b?.fontSizePx != null && b.fontSizePx > 0 ? { fontSize: b.fontSizePx } : {}),
    ...(b?.color?.trim() ? { color: b.color.trim() } : {}),
    ...(w != null ? { fontWeight: w } : {}),
  };
}

export function bookingPageBlockText(
  key: BookingPageBlockKey,
  cfg: BookingPricingConfig | undefined,
  lang: string,
  t: TFunction
): string {
  const b = blockFromConfig(cfg, lang, key);
  const custom = b?.text?.trim();
  if (custom) return b!.text!.trim();
  const i18nKey = BOOKING_PAGE_BLOCK_I18N[key];
  if (i18nKey) return t(i18nKey);
  return HARDCODED_NAME[key] ?? '';
}

export function getBookingPageBlockForAdmin(
  cfg: BookingPricingConfig,
  locale: AdminContentLocale,
  key: BookingPageBlockKey
): BookingPageBlock {
  return cfg.bookingPage?.locales?.[locale]?.[key] ?? {};
}

/** Text shown on the public booking page for this locale (CMS override or i18n / hardcoded). */
export function readBookingPageBlockTextForAdmin(
  cfg: BookingPricingConfig,
  locale: AdminContentLocale,
  key: BookingPageBlockKey,
  tForLocale: TFunction
): string {
  const cms = cfg.bookingPage?.locales?.[locale]?.[key]?.text?.trim();
  if (cms) return cfg.bookingPage!.locales![locale]![key]!.text!;
  const i18nKey = BOOKING_PAGE_BLOCK_I18N[key];
  if (i18nKey) return tForLocale(i18nKey);
  return HARDCODED_NAME[key] ?? '';
}

/** Effective typography for admin inputs (saved override or built-in default for the block). */
export function readBookingPageBlockStyleForAdmin(
  cfg: BookingPricingConfig,
  locale: AdminContentLocale,
  key: BookingPageBlockKey
): {
  fontSizePx: number;
  colorHex: string;
  fontWeight: BookingPageFontWeight | '';
} {
  const b = cfg.bookingPage?.locales?.[locale]?.[key];
  const d = BOOKING_PAGE_DEFAULT_STYLES[key];
  const defSize = typeof d.fontSize === 'number' ? d.fontSize : 14;
  const defColor = typeof d.color === 'string' ? d.color : '#333333';
  return {
    fontSizePx: b?.fontSizePx ?? defSize,
    colorHex: b?.color?.trim() ? b.color.trim() : defColor,
    fontWeight: b?.fontWeight ?? '',
  };
}

export function defaultFontSizePxForBookingBlock(key: BookingPageBlockKey): number {
  const d = BOOKING_PAGE_DEFAULT_STYLES[key];
  return typeof d.fontSize === 'number' ? d.fontSize : 14;
}

export function defaultColorForBookingBlock(key: BookingPageBlockKey): string {
  const d = BOOKING_PAGE_DEFAULT_STYLES[key];
  return typeof d.color === 'string' ? d.color : '#333333';
}

export function patchBookingPageBlock(
  cfg: BookingPricingConfig,
  locale: AdminContentLocale,
  key: BookingPageBlockKey,
  patch: Partial<BookingPageBlock>
): BookingPricingConfig {
  const prevBp = cfg.bookingPage ?? { locales: {} };
  const prevLoc = prevBp.locales?.[locale] ?? {};
  const prevBlock = prevLoc[key] ?? {};
  const next: BookingPageBlock = { ...prevBlock };

  if (patch.text !== undefined) {
    if (patch.text.trim() === '') delete next.text;
    else next.text = patch.text;
  }
  if ('fontSizePx' in patch) {
    if (patch.fontSizePx == null || patch.fontSizePx <= 0) delete next.fontSizePx;
    else next.fontSizePx = patch.fontSizePx;
  }
  if (patch.color !== undefined) {
    const c = patch.color.trim();
    if (!c) delete next.color;
    else next.color = c;
  }
  if ('fontWeight' in patch) {
    if (patch.fontWeight) next.fontWeight = patch.fontWeight;
    else delete next.fontWeight;
  }

  const locNext = { ...prevLoc };
  const nonempty =
    (next.text != null && next.text.trim() !== '') ||
    next.fontSizePx != null ||
    (next.color != null && next.color.trim() !== '') ||
    next.fontWeight != null;
  if (nonempty) locNext[key] = next;
  else delete locNext[key];

  const locales = { ...prevBp.locales, [locale]: locNext };
  if (Object.keys(locNext).length === 0) delete locales[locale];

  return {
    ...cfg,
    bookingPage:
      Object.keys(locales).length > 0 ? { ...prevBp, locales } : undefined,
  };
}

export type BookingPageEditorBlockDef = {
  key: BookingPageBlockKey;
  label: string;
  hint: string;
  rows?: number;
};

export type BookingPageEditorGroup = { title: string; blocks: BookingPageEditorBlockDef[] };

export const BOOKING_PAGE_EDITOR_GROUPS: BookingPageEditorGroup[] = [
  {
    title: 'Sidebar — header & rates note',
    blocks: [
      { key: 'title', label: 'Page title', hint: 'Main heading above the intro.', rows: 2 },
      { key: 'intro', label: 'Intro paragraph', hint: 'Short explanation under the title.', rows: 4 },
      {
        key: 'ratesHintBefore',
        label: 'Rates hint — before highlight',
        hint: 'Text before the colored word (e.g. “Dates in ”).',
        rows: 3,
      },
      {
        key: 'ratesHintHighlight',
        label: 'Rates hint — highlighted word',
        hint: 'Short word or phrase (was red). Set color below.',
        rows: 2,
      },
      {
        key: 'ratesHintAfter',
        label: 'Rates hint — after highlight',
        hint: 'Text after the colored word.',
        rows: 3,
      },
      { key: 'chooseExperience', label: '“Choose experience” label', hint: 'Above the three package buttons.', rows: 2 },
    ],
  },
  {
    title: 'Package cards (Oneiro / Pétra / Estate)',
    blocks: [
      { key: 'pkgA_name', label: 'Package A — name', hint: 'Default: Oneiro', rows: 1 },
      { key: 'pkgA_desc', label: 'Package A — description', hint: '', rows: 2 },
      { key: 'pkgA_guests', label: 'Package A — guests line', hint: '', rows: 1 },
      { key: 'pkgB_name', label: 'Package B — name', hint: 'Default: Villa Pétra', rows: 1 },
      { key: 'pkgB_desc', label: 'Package B — description', hint: '', rows: 2 },
      { key: 'pkgB_guests', label: 'Package B — guests line', hint: '', rows: 1 },
      { key: 'pkgC_name', label: 'Package C — name', hint: 'Default: Grey Estate', rows: 1 },
      { key: 'pkgC_desc', label: 'Package C — description', hint: '', rows: 2 },
      { key: 'pkgC_guests', label: 'Package C — guests line', hint: '', rows: 1 },
    ],
  },
  {
    title: 'Calendar column',
    blocks: [
      { key: 'calendarPrompt', label: 'Calendar toolbar prompt', hint: 'Line next to the calendar icon.', rows: 2 },
      { key: 'legendSelected', label: 'Legend — selected', hint: '', rows: 1 },
      { key: 'legendMinStay', label: 'Legend — min-stay', hint: 'Often styled in a warning color.', rows: 2 },
      {
        key: 'selectExperienceCalendar',
        label: 'Overlay — pick experience first',
        hint: 'Message when no package is selected.',
        rows: 2,
      },
    ],
  },
  {
    title: 'Info cards under calendar',
    blocks: [
      { key: 'policyTitle', label: 'Booking policy — title', hint: '', rows: 1 },
      { key: 'policyText', label: 'Booking policy — body', hint: '', rows: 4 },
      { key: 'secureTitle', label: 'Secure payments — title', hint: '', rows: 1 },
      { key: 'secureText', label: 'Secure payments — body', hint: '', rows: 4 },
    ],
  },
];
