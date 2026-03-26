import type { CSSProperties } from 'react';

/** Global home + shell styling (not per spoken language). Persisted in home.json under `siteUi`. */
export type HomeSiteSectionKey =
  | 'pageShell'
  | 'topBar'
  | 'header'
  | 'hero'
  | 'philosophy'
  | 'gallery'
  | 'footer';

export type HomeSiteFontWeight = '' | '300' | '400' | '500' | '600' | '700';

export interface HomeSiteUiText {
  fontSizePx?: number;
  colorHex?: string;
  fontWeight?: HomeSiteFontWeight;
}

/** Hero-only: draggable text regions (percent of hero content box, anchor = center). */
export type HeroUiBlockKey = 'location' | 'headline' | 'description' | 'actions';

export interface HeroBlockPosition {
  /** 0–100 from left of hero content area */
  leftPct: number;
  /** 0–100 from top of hero content area */
  topPct: number;
}

export interface HomeSiteUiSection {
  backgroundColor?: string;
  /** Hero image darkening, 0–100 (%). */
  overlayOpacity?: number;
  /** Hero block min height in viewport height units. */
  minHeightVh?: number;
  textStyles?: Partial<Record<string, HomeSiteUiText>>;
  /** Hero only: when non-empty, home hero uses absolute positioning for these blocks. */
  blockPositions?: Partial<Record<HeroUiBlockKey, HeroBlockPosition>>;
}

export type HomeSiteUi = Partial<Record<HomeSiteSectionKey, HomeSiteUiSection>>;

const SHELL: HomeSiteUiSection = {
  backgroundColor: '#FDFCFB',
};

const TOP: HomeSiteUiSection = {
  backgroundColor: '#8B6F5A',
  textStyles: {
    line: { fontSizePx: 12, colorHex: '#EFEBE4', fontWeight: '400' },
    count: { fontSizePx: 12, colorHex: '#FFFFFF', fontWeight: '600' },
  },
};

const HEADER: HomeSiteUiSection = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  textStyles: {
    logo: { fontSizePx: 24, colorHex: '#2C3539', fontWeight: '400' },
    logoSub: { fontSizePx: 9, colorHex: '#2C3539', fontWeight: '400' },
    navButton: { fontSizePx: 11, colorHex: '#2C3539', fontWeight: '400' },
  },
};

const HERO: HomeSiteUiSection = {
  backgroundColor: 'transparent',
  overlayOpacity: 25,
  minHeightVh: 100,
  textStyles: {
    location: { fontSizePx: 10, colorHex: 'rgba(255,255,255,0.85)', fontWeight: '400' },
    title: { colorHex: '#FFFFFF', fontWeight: '400' },
    subtitle: { colorHex: '#FFFFFF', fontWeight: '300' },
    description: { fontSizePx: 15, colorHex: 'rgba(255,255,255,0.9)', fontWeight: '300' },
    buttonPrimary: { fontSizePx: 10, colorHex: '#000000', fontWeight: '700' },
    buttonSecondary: { fontSizePx: 10, colorHex: '#FFFFFF', fontWeight: '700' },
  },
};

const PHILOSOPHY: HomeSiteUiSection = {
  backgroundColor: '#C7C6C4',
  textStyles: {
    label: { fontSizePx: 10, colorHex: '#A89F91', fontWeight: '400' },
    heading: { fontSizePx: 36, colorHex: '#2C3539', fontWeight: '400' },
    body: { fontSizePx: 18, colorHex: '#4B5563', fontWeight: '300' },
    quote: { fontSizePx: 20, colorHex: '#8B6F5A', fontWeight: '400' },
  },
};

const GALLERY: HomeSiteUiSection = {
  backgroundColor: '#1A1A1A',
  textStyles: {
    label: { fontSizePx: 10, colorHex: 'rgba(255,255,255,0.4)', fontWeight: '400' },
    heading: { fontSizePx: 36, colorHex: '#FFFFFF', fontWeight: '400' },
    description: { fontSizePx: 18, colorHex: 'rgba(255,255,255,0.5)', fontWeight: '300' },
  },
};

const FOOTER: HomeSiteUiSection = {
  backgroundColor: '#1A1F22',
  textStyles: {
    brand: { fontSizePx: 24, colorHex: '#FFFFFF', fontWeight: '400' },
    body: { fontSizePx: 14, colorHex: '#9CA3AF', fontWeight: '300' },
    heading: { fontSizePx: 20, colorHex: '#FFFFFF', fontWeight: '400' },
  },
};

export const HOME_SITE_UI_DEFAULTS: Record<HomeSiteSectionKey, HomeSiteUiSection> = {
  pageShell: SHELL,
  topBar: TOP,
  header: HEADER,
  hero: HERO,
  philosophy: PHILOSOPHY,
  gallery: GALLERY,
  footer: FOOTER,
};

/** Centered stack approximated as % positions when custom hero layout is enabled. */
export const HERO_BLOCK_DEFAULTS: Record<HeroUiBlockKey, HeroBlockPosition> = {
  location: { leftPct: 50, topPct: 30 },
  headline: { leftPct: 50, topPct: 44 },
  description: { leftPct: 50, topPct: 58 },
  actions: { leftPct: 50, topPct: 74 },
};

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(2, Math.min(98, n));
}

export function resolveHeroBlockPositions(
  partial?: Partial<Record<HeroUiBlockKey, HeroBlockPosition>> | null
): Record<HeroUiBlockKey, HeroBlockPosition> {
  const keys: HeroUiBlockKey[] = ['location', 'headline', 'description', 'actions'];
  const out = { ...HERO_BLOCK_DEFAULTS };
  if (!partial) return out;
  for (const k of keys) {
    const p = partial[k];
    if (!p) continue;
    out[k] = { leftPct: clampPct(p.leftPct), topPct: clampPct(p.topPct) };
  }
  return out;
}

/** True when saved siteUi requests free-position hero blocks (public + admin preview). */
export function isHeroFreeLayout(hero: HomeSiteUiSection | undefined): boolean {
  const bp = hero?.blockPositions;
  return !!bp && Object.keys(bp).length > 0;
}

export function heroBlockPositionStyle(p: HeroBlockPosition): CSSProperties {
  return {
    position: 'absolute',
    left: `${clampPct(p.leftPct)}%`,
    top: `${clampPct(p.topPct)}%`,
    transform: 'translate(-50%, -50%)',
    maxWidth: 'min(64rem, 92vw)',
    pointerEvents: 'auto',
  };
}

function mergeTextStyles(
  base: Record<string, HomeSiteUiText> | undefined,
  over: Record<string, HomeSiteUiText> | undefined
): Record<string, HomeSiteUiText> {
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(over || {})]);
  const out: Record<string, HomeSiteUiText> = {};
  for (const k of keys) {
    out[k] = { ...(base?.[k] || {}), ...(over?.[k] || {}) };
  }
  return out;
}

function mergeSection(
  def: HomeSiteUiSection,
  user: HomeSiteUiSection | undefined
): HomeSiteUiSection {
  if (!user) {
    return {
      ...def,
      textStyles: mergeTextStyles(def.textStyles, {}),
    };
  }
  return {
    ...def,
    ...user,
    textStyles: mergeTextStyles(def.textStyles, user.textStyles),
  };
}

export type ResolvedHomeSiteUi = Record<HomeSiteSectionKey, HomeSiteUiSection>;

export function mergeHomeSiteUi(raw?: HomeSiteUi | null): ResolvedHomeSiteUi {
  const u = raw || {};
  return {
    pageShell: mergeSection(HOME_SITE_UI_DEFAULTS.pageShell, u.pageShell),
    topBar: mergeSection(HOME_SITE_UI_DEFAULTS.topBar, u.topBar),
    header: mergeSection(HOME_SITE_UI_DEFAULTS.header, u.header),
    hero: mergeSection(HOME_SITE_UI_DEFAULTS.hero, u.hero),
    philosophy: mergeSection(HOME_SITE_UI_DEFAULTS.philosophy, u.philosophy),
    gallery: mergeSection(HOME_SITE_UI_DEFAULTS.gallery, u.gallery),
    footer: mergeSection(HOME_SITE_UI_DEFAULTS.footer, u.footer),
  };
}

/** Inline styles from CMS text style; omit keys so existing CSS classes still apply. */
export function homeUiTextStyle(t?: HomeSiteUiText | null): CSSProperties {
  if (!t) return {};
  const s: CSSProperties = {};
  if (t.fontSizePx != null && !Number.isNaN(t.fontSizePx)) s.fontSize = `${t.fontSizePx}px`;
  if (t.colorHex && t.colorHex.trim()) s.color = t.colorHex.trim();
  if (t.fontWeight) s.fontWeight = t.fontWeight;
  return s;
}

export function homeUiSectionBackground(section: HomeSiteUiSection | undefined): CSSProperties {
  if (!section?.backgroundColor?.trim()) return {};
  return { backgroundColor: section.backgroundColor.trim() };
}

/** Admin: raw saved value for a text role (only explicit overrides). */
export function readHomeSiteUiTextRaw(
  raw: HomeSiteUi | undefined,
  section: HomeSiteSectionKey,
  role: string
): HomeSiteUiText {
  return { ...(raw?.[section]?.textStyles?.[role] || {}) };
}

/** Admin: effective preview = defaults + raw overrides (for showing current look). */
export function readHomeSiteUiTextForAdmin(
  raw: HomeSiteUi | undefined,
  section: HomeSiteSectionKey,
  role: string
): HomeSiteUiText {
  const def = HOME_SITE_UI_DEFAULTS[section]?.textStyles?.[role] || {};
  const o = raw?.[section]?.textStyles?.[role] || {};
  return { ...def, ...o };
}

function pruneEmptySiteUi(siteUi: HomeSiteUi): HomeSiteUi | undefined {
  const out: HomeSiteUi = {};
  for (const key of Object.keys(siteUi) as HomeSiteSectionKey[]) {
    const sec = siteUi[key];
    if (!sec) continue;
    const hasText = sec.textStyles && Object.keys(sec.textStyles).length > 0;
    const hasBg = !!sec.backgroundColor?.trim();
    const hasHeroBlocks =
      key === 'hero' && sec.blockPositions && Object.keys(sec.blockPositions).length > 0;
    const extra =
      key === 'hero' &&
      ((sec.overlayOpacity != null && sec.overlayOpacity !== HOME_SITE_UI_DEFAULTS.hero.overlayOpacity) ||
        (sec.minHeightVh != null && sec.minHeightVh !== HOME_SITE_UI_DEFAULTS.hero.minHeightVh) ||
        hasHeroBlocks);
    if (hasText || hasBg || extra) out[key] = { ...sec };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Merge full text role for admin then persist only diffs from theme defaults. */
export function applyHomeSiteUiTextOverride(
  prev: HomeSiteUi | undefined,
  section: HomeSiteSectionKey,
  role: string,
  merged: HomeSiteUiText
): HomeSiteUi | undefined {
  const defRole = HOME_SITE_UI_DEFAULTS[section]?.textStyles?.[role] || {};
  const nextRole: HomeSiteUiText = {};
  if (merged.fontSizePx != null && !Number.isNaN(merged.fontSizePx) && merged.fontSizePx !== defRole.fontSizePx) {
    nextRole.fontSizePx = merged.fontSizePx;
  }
  const c = (merged.colorHex || '').trim();
  const dc = (defRole.colorHex || '').trim();
  if (c && c !== dc) nextRole.colorHex = c;
  const mW = merged.fontWeight ?? '';
  const dW = defRole.fontWeight ?? '';
  if (mW !== '' && mW !== dW) {
    nextRole.fontWeight = mW as HomeSiteFontWeight;
  }

  const siteUi: HomeSiteUi = JSON.parse(JSON.stringify(prev || {}));
  if (!siteUi[section]) siteUi[section] = {};
  const ts = { ...(siteUi[section]!.textStyles || {}) };
  if (Object.keys(nextRole).length === 0) delete ts[role];
  else ts[role] = nextRole;
  if (Object.keys(ts).length === 0) delete siteUi[section]!.textStyles;
  else siteUi[section]!.textStyles = ts;

  return pruneEmptySiteUi(siteUi);
}

export function applyHomeSiteUiSectionBg(
  prev: HomeSiteUi | undefined,
  section: HomeSiteSectionKey,
  colorHex: string
): HomeSiteUi | undefined {
  const def = HOME_SITE_UI_DEFAULTS[section]?.backgroundColor || '';
  const c = colorHex.trim();
  const siteUi: HomeSiteUi = JSON.parse(JSON.stringify(prev || {}));
  const sec: HomeSiteUiSection = { ...(siteUi[section] || {}) };
  if (!c || c === def) delete sec.backgroundColor;
  else sec.backgroundColor = c;

  const hasText = sec.textStyles && Object.keys(sec.textStyles).length > 0;
  const hasBg = !!sec.backgroundColor?.trim();
  const hasHeroBlocks =
    section === 'hero' && sec.blockPositions && Object.keys(sec.blockPositions).length > 0;
  const hasHeroExtra =
    section === 'hero' &&
    ((sec.overlayOpacity != null && sec.overlayOpacity !== HOME_SITE_UI_DEFAULTS.hero.overlayOpacity) ||
      (sec.minHeightVh != null && sec.minHeightVh !== HOME_SITE_UI_DEFAULTS.hero.minHeightVh) ||
      hasHeroBlocks);
  if (hasText || hasBg || hasHeroExtra) siteUi[section] = sec;
  else delete siteUi[section];

  return pruneEmptySiteUi(siteUi);
}

export function applyHeroOverlay(prev: HomeSiteUi | undefined, opacity: number): HomeSiteUi | undefined {
  const def = HOME_SITE_UI_DEFAULTS.hero.overlayOpacity ?? 25;
  const siteUi: HomeSiteUi = JSON.parse(JSON.stringify(prev || {}));
  if (!siteUi.hero) siteUi.hero = {};
  if (opacity === def || Number.isNaN(opacity)) {
    delete siteUi.hero.overlayOpacity;
  } else {
    siteUi.hero.overlayOpacity = Math.max(0, Math.min(100, opacity));
  }
  if (Object.keys(siteUi.hero).length === 0) delete siteUi.hero;
  return pruneEmptySiteUi(siteUi);
}

export function applyHeroMinHeight(prev: HomeSiteUi | undefined, vh: number): HomeSiteUi | undefined {
  const def = HOME_SITE_UI_DEFAULTS.hero.minHeightVh ?? 100;
  const siteUi: HomeSiteUi = JSON.parse(JSON.stringify(prev || {}));
  if (!siteUi.hero) siteUi.hero = {};
  if (vh === def || Number.isNaN(vh)) {
    delete siteUi.hero.minHeightVh;
  } else {
    siteUi.hero.minHeightVh = Math.max(40, Math.min(200, vh));
  }
  if (Object.keys(siteUi.hero).length === 0) delete siteUi.hero;
  return pruneEmptySiteUi(siteUi);
}

/** Persist all hero block positions (typically after dragging in admin). */
export function applyHeroBlockPositions(
  prev: HomeSiteUi | undefined,
  positions: Record<HeroUiBlockKey, HeroBlockPosition>
): HomeSiteUi | undefined {
  const siteUi: HomeSiteUi = JSON.parse(JSON.stringify(prev || {}));
  if (!siteUi.hero) siteUi.hero = {};
  siteUi.hero.blockPositions = {
    location: { ...positions.location },
    headline: { ...positions.headline },
    description: { ...positions.description },
    actions: { ...positions.actions },
  };
  return pruneEmptySiteUi(siteUi);
}

/** Remove custom positioning; hero returns to centered stack layout. */
export function clearHeroBlockPositions(prev: HomeSiteUi | undefined): HomeSiteUi | undefined {
  if (!prev?.hero?.blockPositions) return prev;
  const siteUi: HomeSiteUi = JSON.parse(JSON.stringify(prev));
  delete siteUi.hero!.blockPositions;
  if (siteUi.hero && Object.keys(siteUi.hero).length === 0) delete siteUi.hero;
  return pruneEmptySiteUi(siteUi);
}

/** First-time enable: seed defaults so layout mode activates and blocks are draggable. */
export function seedHeroCustomBlockLayout(prev: HomeSiteUi | undefined): HomeSiteUi | undefined {
  return applyHeroBlockPositions(prev, { ...HERO_BLOCK_DEFAULTS });
}

export interface HomeSiteUiEditorRole {
  key: string;
  label: string;
}

export interface HomeSiteUiEditorGroup {
  section: HomeSiteSectionKey;
  title: string;
  description: string;
  roles: HomeSiteUiEditorRole[];
  showOverlay?: boolean;
  showMinHeight?: boolean;
}

export const HOME_SITE_UI_EDITOR_GROUPS: HomeSiteUiEditorGroup[] = [
  {
    section: 'pageShell',
    title: 'Page shell',
    description: 'Background behind the whole site (main wrapper).',
    roles: [],
  },
  {
    section: 'topBar',
    title: 'Top notification bar',
    description: 'Scarcity / viewers strip above the header.',
    roles: [
      { key: 'line', label: 'Viewer line text' },
      { key: 'count', label: 'Viewer count' },
    ],
  },
  {
    section: 'header',
    title: 'Main header',
    description: 'Logo row and nav buttons (global).',
    roles: [
      { key: 'logo', label: 'Logo title' },
      { key: 'logoSub', label: 'Logo subtitle (By Katouna)' },
      { key: 'navButton', label: 'Header buttons (Book / Contact)' },
    ],
  },
  {
    section: 'hero',
    title: 'Home hero',
    description: 'Full-bleed hero on the home page.',
    roles: [
      { key: 'location', label: 'Location line' },
      { key: 'title', label: 'Main title' },
      { key: 'subtitle', label: 'Subtitle (italic line)' },
      { key: 'description', label: 'Description paragraph' },
      { key: 'buttonPrimary', label: 'Primary button (solid)' },
      { key: 'buttonSecondary', label: 'Secondary link' },
    ],
    showOverlay: true,
    showMinHeight: true,
  },
  {
    section: 'philosophy',
    title: 'Philosophy section',
    description: '“The Vision” block with images on the home page.',
    roles: [
      { key: 'label', label: 'Section label' },
      { key: 'heading', label: 'Heading' },
      { key: 'body', label: 'Body paragraphs' },
      { key: 'quote', label: 'Quote line' },
    ],
  },
  {
    section: 'gallery',
    title: 'Gallery / film section',
    description: 'Dark band with gallery heading and estate film.',
    roles: [
      { key: 'label', label: 'Section label' },
      { key: 'heading', label: 'Heading' },
      { key: 'description', label: 'Description' },
    ],
  },
  {
    section: 'footer',
    title: 'Footer',
    description: 'Contact area and bottom bar (global).',
    roles: [
      { key: 'brand', label: 'Brand name' },
      { key: 'body', label: 'Tagline & body text' },
      { key: 'heading', label: 'Section headings (Direct inquiries, etc.)' },
    ],
  },
];
