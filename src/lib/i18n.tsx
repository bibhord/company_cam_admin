'use client';

import React, { createContext, useContext, useMemo } from 'react';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

export type Locale = 'en' | 'es';

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'es', label: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}' },
];

type Messages = Record<string, unknown>;

const messages: Record<Locale, Messages> = { en, es };

function resolve(obj: unknown, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

interface LocaleContextValue {
  t: (key: string) => string;
  locale: Locale;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(() => {
    const dict = messages[locale] ?? messages.en;
    return {
      t: (key: string) => resolve(dict, key),
      locale,
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a <LocaleProvider>');
  }
  return ctx;
}
