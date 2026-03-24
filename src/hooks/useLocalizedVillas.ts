import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Villa } from '../types';
import { mergeVillaWithLocale } from '../lib/mergeVillaWithLocale';

/** Applies `villas` overlays from the active locale JSON over API/CMS data. */
export function useLocalizedVillas(villas: Villa[]): Villa[] {
  const { i18n } = useTranslation();
  return useMemo(
    () => villas.map((v) => mergeVillaWithLocale(v, i18n.language)),
    [villas, i18n.language]
  );
}
