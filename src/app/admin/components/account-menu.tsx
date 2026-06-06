'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LogoutButton } from '../logout-button';
import { useLocale } from '@/lib/i18n';

interface AccountMenuProps {
  initials: string;
  fullName: string;
  email: string;
}

export function AccountMenu({ initials, fullName, email }: AccountMenuProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const sections = [
    {
      items: [
        { labelKey: 'admin.account.myPhotos', href: '/admin/photos' },
        { labelKey: 'admin.account.mySettings', href: '/admin/settings' },
        { labelKey: 'admin.account.notifications', href: '/admin/settings/notifications' },
      ],
    },
    {
      labelKey: 'admin.account.company',
      items: [
        { labelKey: 'admin.account.companySettings', href: '/admin/settings/company' },
        { labelKey: 'admin.account.billing', href: '/admin/billing' },
        { labelKey: 'admin.account.tags', href: '/admin/tags' },
      ],
    },
    {
      labelKey: 'admin.account.support',
      items: [
        { labelKey: 'admin.account.helpCenter', href: '/admin/help' },
        { labelKey: 'admin.account.chatWithSupport', href: '/admin/support/chat' },
      ],
    },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 w-full text-left"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
          {initials || 'U'}
        </div>
        <div className="hidden lg:block min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate leading-tight">{fullName}</p>
          <p className="text-xs text-slate-500 truncate leading-tight">{email}</p>
        </div>
        <svg className="hidden lg:block h-4 w-4 shrink-0 text-slate-400 ml-auto" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 origin-bottom-left rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-lg">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 mb-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
              {initials || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{fullName || 'Account'}</p>
              <p className="text-xs text-slate-500 truncate">{email}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sections.map((section, index) => (
              <div key={section.labelKey ?? `section-${index}`}>
                {section.labelKey ? (
                  <p className="mt-2 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t(section.labelKey)}
                  </p>
                ) : null}
                {section.items.map((item) => (
                  item.href ? (
                    <Link
                      key={item.labelKey}
                      className="flex items-center rounded-lg px-3 py-1.5 text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ) : (
                    <span key={item.labelKey} className="flex items-center rounded-lg px-3 py-1.5 text-[13px] text-slate-400">
                      {t(item.labelKey)}
                    </span>
                  )
                ))}
              </div>
            ))}
          </nav>

          <div className="mt-1 border-t border-slate-100 pt-1">
            <LogoutButton variant="ghost" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
