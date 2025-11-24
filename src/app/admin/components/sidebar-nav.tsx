'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-8">
      {sections.map((section) => (
        <div key={section.label ?? section.items[0]?.href}>
          {section.label ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {section.label}
            </p>
          ) : null}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-100'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-200">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
