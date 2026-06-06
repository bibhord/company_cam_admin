import en from '@/locales/en.json';
import es from '@/locales/es.json';

export type AdminLocale = 'en' | 'es';

const messages = { en, es } as const;

function resolve(obj: unknown, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

export function createAdminT(locale: AdminLocale) {
  const dict = messages[locale] ?? messages.en;
  return function t(key: string): string {
    return resolve(dict, key);
  };
}
