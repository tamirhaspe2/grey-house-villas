import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../i18n';

const NATIVE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  he: 'עברית',
  fr: 'Français',
  el: 'Ελληνικά',
};

export default function LanguageSwitcher({
  className = '',
  id = 'site-language',
}: {
  className?: string;
  id?: string;
}) {
  const { i18n, t } = useTranslation();
  const value =
    SUPPORTED_LOCALES.includes(i18n.language as SupportedLocale)
      ? i18n.language
      : SUPPORTED_LOCALES.find((c) => i18n.language.startsWith(c)) ?? 'en';

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => void i18n.changeLanguage(e.target.value as SupportedLocale)}
      className={className}
      aria-label={t('layout.languageLabel', { defaultValue: 'Language' })}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code}>
          {NATIVE_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
