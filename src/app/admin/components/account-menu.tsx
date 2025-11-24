'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LogoutButton } from '../logout-button';

interface MenuSection {
  label?: string;
  items: Array<{ label: string; href?: string; icon?: React.ReactNode }>;
}

interface AccountMenuProps {
  initials: string;
  fullName: string;
  email: string;
}

const accountSections: MenuSection[] = [
  {
    items: [
      { label: 'My Photos', href: '/admin/photos' },
      { label: 'My Settings', href: '/admin/settings' },
      { label: 'Notification Settings', href: '/admin/settings/notifications' },
    ],
  },
  {
    label: 'Your Company',
    items: [
      { label: 'Access Tokens', href: '/admin/access-tokens' },
      { label: 'Billing', href: '/admin/billing' },
      { label: 'Community Checklists', href: '/admin/community/checklists' },
      { label: 'Company Dashboard', href: '/admin/dashboard' },
      { label: 'Company Settings', href: '/admin/settings/company' },
      { label: 'Tags', href: '/admin/tags' },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Help Center', href: '/admin/help' },
      { label: 'Chat with Support', href: '/admin/support/chat' },
      { label: 'Manage Cookies', href: '/admin/settings/privacy' },
    ],
  },
];

export function AccountMenu({ initials, fullName, email }: AccountMenuProps) {
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initials || 'U'}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-72 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 text-sm text-slate-700 shadow-xl ring-1 ring-black/5 lg:left-full lg:right-auto lg:origin-top-left lg:translate-x-4">
          <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {initials || 'U'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{fullName || 'Account'}</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
          </div>

          <nav className="mt-3 space-y-4">
            {accountSections.map((section, index) => (
              <div key={section.label ?? `section-${index}`}>
                {section.label ? (
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {section.label}
                  </p>
                ) : null}
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.label}>
                      {item.href ? (
                        <Link
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                          href={item.href}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400">
                          {item.icon}
                          <span>{item.label}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <LogoutButton variant="ghost" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
