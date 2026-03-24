import type { AdminContentLocale } from './cmsLocaleTypes';
import i18n from '../i18n';
import { mergeHomeWithLocale, type HomeContentShape } from './mergeHomeWithLocale';

function getDeep(obj: unknown, path: string[]): unknown {
  if (obj == null || path.length === 0) return path.length === 0 ? obj : undefined;
  const [a, ...r] = path;
  return getDeep((obj as Record<string, unknown>)[a], r);
}

export function setDeepImmutable(obj: unknown, path: string[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [k, ...rest] = path;
  const base =
    obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
  const cur = base[k];
  const next = setDeepImmutable(cur, rest, value);
  return { ...base, [k]: next };
}

/** Deep-merge overlay into base (objects recurse; arrays replaced). */
export function deepMergePublicHome<T extends Record<string, unknown>>(
  base: T,
  overlay: Record<string, unknown>
): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overlay)) {
    const ov = overlay[key];
    const bv = base[key];
    if (ov === undefined) continue;
    if (Array.isArray(ov)) {
      out[key] = ov;
    } else if (ov !== null && typeof ov === 'object') {
      out[key] = deepMergePublicHome(
        (bv && typeof bv === 'object' && !Array.isArray(bv) ? bv : {}) as Record<string, unknown>,
        ov as Record<string, unknown>
      );
    } else {
      out[key] = ov;
    }
  }
  return out as T;
}

export function mergeHomeDataWithCmsLocale<T extends Record<string, unknown>>(home: T, lng: string): T {
  if (lng === 'en') return home;
  const patch = (home as { localeStrings?: Record<string, Record<string, unknown>> }).localeStrings?.[lng];
  if (!patch || typeof patch !== 'object') return home;
  return deepMergePublicHome(home, patch);
}

export function readHomeAtPath(
  home: Record<string, unknown>,
  locale: AdminContentLocale,
  path: string[]
): unknown {
  if (locale === 'en') return getDeep(home, path);
  return getDeep((home.localeStrings as Record<string, unknown> | undefined)?.[locale], path);
}

export function editHomeAtPath(
  home: Record<string, unknown>,
  locale: AdminContentLocale,
  path: string[],
  value: unknown
): Record<string, unknown> {
  if (locale === 'en') {
    return setDeepImmutable(home, path, value) as Record<string, unknown>;
  }
  const ls = { ...((home.localeStrings as Record<string, unknown>) || {}) };
  const slice = { ...(ls[locale] as Record<string, unknown> | undefined) || {} };
  ls[locale] = setDeepImmutable(slice, path, value);
  return { ...home, localeStrings: ls };
}

/** Same merged home object the public Home page uses for `lng` (locale JSON + `localeStrings`). */
export function getMergedHomeDisplayForAdmin(
  home: Record<string, unknown>,
  lng: string
): Record<string, unknown> {
  if (lng === 'en') return home;
  const afterJson = mergeHomeWithLocale(
    home as unknown as HomeContentShape,
    lng,
    i18n.getResourceBundle(lng, 'translation') as { home?: Partial<HomeContentShape> }
  );
  return mergeHomeDataWithCmsLocale(afterJson as unknown as Record<string, unknown>, lng);
}

/** Admin field value for a path: matches the live site for non-English (not CMS-only). */
export function readHomeFieldForAdmin(
  home: Record<string, unknown>,
  locale: AdminContentLocale,
  path: string[]
): unknown {
  if (locale === 'en') return getDeep(home, path);
  const merged = getMergedHomeDisplayForAdmin(home, locale);
  return getDeep(merged, path);
}
