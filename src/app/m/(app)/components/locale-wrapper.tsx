'use client';

import { LocaleProvider, type Locale } from '@/lib/i18n';

export function LocaleWrapper({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
