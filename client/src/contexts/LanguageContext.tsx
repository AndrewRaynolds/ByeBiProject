import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import itTranslations from '../locales/it.json';

export type Locale = 'it' | 'en' | 'es';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

type TranslationMap = Record<string, string>;

const translationCache: Record<Locale, TranslationMap | null> = {
  it: itTranslations as TranslationMap,
  en: null,
  es: null,
};

async function loadTranslations(locale: Locale): Promise<TranslationMap> {
  if (translationCache[locale]) return translationCache[locale]!;

  const modules: Record<Locale, () => Promise<{ default: TranslationMap }>> = {
    it: () => import('../locales/it.json'),
    en: () => import('../locales/en.json'),
    es: () => import('../locales/es.json'),
  };

  const mod = await modules[locale]();
  translationCache[locale] = mod.default;
  return mod.default;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`));
}

function getInitialTranslations(locale: Locale): TranslationMap {
  return translationCache[locale] || (itTranslations as TranslationMap);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('byebi_locale') as Locale | null;
    return saved && ['it', 'en', 'es'].includes(saved) ? saved : 'it';
  });

  const [translations, setTranslations] = useState<TranslationMap>(() => getInitialTranslations(locale));

  useEffect(() => {
    loadTranslations(locale).then(setTranslations);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('byebi_locale', newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = translations[key];
    if (value === undefined) {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing key: "${key}" for locale "${locale}"`);
      }
      return key;
    }
    return interpolate(value, params);
  }, [translations, locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return ctx;
}

export function useLocale(): Locale {
  const { locale } = useTranslation();
  return locale;
}
