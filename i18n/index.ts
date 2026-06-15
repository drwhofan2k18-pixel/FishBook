import { useState, useCallback, useEffect } from 'react';
import * as Localization from 'expo-localization';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import de from './de.json';
import ja from './ja.json';
import pt from './pt.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Translations = Record<string, unknown>;
type FlatKey = string;

const translations: Record<string, Translations> = { en, es, fr, de, ja, pt };
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'pt'];
const STORAGE_KEY = 'fishbook_language';

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function resolveLanguage(deviceLocale?: string): string {
  if (!deviceLocale) return 'en';
  const langCode = deviceLocale.split('-')[0].split('_')[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(langCode)) return langCode;
  return 'en';
}

let currentLang = resolveLanguage(Localization.getLocales()[0]?.languageCode ?? 'en');

export function t(key: string, params?: Record<string, string | number>): string {
  const value = getNestedValue(translations[currentLang] ?? translations.en, key);
  if (!value) {
    const fallback = getNestedValue(translations.en, key);
    return fallback ?? key;
  }

  if (!params) return value;

  let result = value;
  for (const [param, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val));
  }
  return result;
}

export function getCurrentLanguage(): string {
  return currentLang;
}

export function setLanguage(lang: string): void {
  if (SUPPORTED_LANGUAGES.includes(lang)) {
    currentLang = lang;
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }
}

export function useTranslation() {
  const [lang, setLang] = useState(currentLang);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
          currentLang = stored;
          setLang(stored);
        }
      })
      .catch(() => {});
  }, []);

  const translate = useCallback((key: string, params?: Record<string, string | number>) => t(key, params), [lang]);

  const changeLanguage = useCallback((newLang: string) => {
    setLanguage(newLang);
    setLang(newLang);
  }, []);

  return {
    t: translate,
    language: lang,
    setLanguage: changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

export const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  pt: 'Português',
};
