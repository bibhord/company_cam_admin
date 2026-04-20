'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MobileHeader } from '../components/mobile-header';
import { openCrispChat } from '../components/crisp-mobile-manager';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
  language: string;
  specialty: string | null;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const SPECIALTIES = [
  { value: 'general_contractor', label: 'General Contractor' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'hvac', label: 'HVAC Technician' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'painter', label: 'Painter' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'mason', label: 'Mason' },
  { value: 'other', label: 'Other' },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/m/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    }
    fetchProfile();
  }, []);

  async function updatePreference(key: string, value: string) {
    setSavingPref(true);
    try {
      const res = await fetch('/api/m/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok && profile) {
        setProfile({ ...profile, [key]: value });
        // If language changed, reload to apply new locale
        if (key === 'language') {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Failed to update preference:', err);
    } finally {
      setSavingPref(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await fetch('/api/m/delete-account', { method: 'DELETE' });
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = '/m/login';
    } catch (err) {
      console.error('Delete account failed:', err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
      // Nuclear clear to prevent stale session conflicts on next login
      localStorage.clear();
      // Hard redirect to fully reset WKWebView state
      window.location.href = '/m/login';
    } catch (err) {
      console.error('Sign out failed:', err);
      setSigningOut(false);
    }
  }

  const initials = profile
    ? [profile.first_name?.[0], profile.last_name?.[0]]
        .filter(Boolean)
        .join('')
        .toUpperCase() || profile.email.slice(0, 2).toUpperCase()
    : '';

  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
    : '';

  const currentLang = LANGUAGES.find((l) => l.code === profile?.language) ?? LANGUAGES[0];
  const currentSpecialty = SPECIALTIES.find((s) => s.value === profile?.specialty);

  const menuItems = [
    {
      label: 'My Photos',
      href: '/m',
      icon: (
        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      ),
    },
    {
      label: 'Notification Settings',
      href: '/admin/settings/notifications',
      icon: (
        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      ),
    },
    {
      label: 'Company Settings',
      href: '/admin/settings/company',
      icon: (
        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <MobileHeader title="Settings" />

      <div className="p-4 space-y-6">
        {/* User info */}
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
            {initials || '...'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {fullName || 'Loading...'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {profile?.email ?? ''}
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Language</p>
          </div>
          {LANGUAGES.map((lang, idx) => (
            <button
              key={lang.code}
              onClick={() => updatePreference('language', lang.code)}
              disabled={savingPref}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-slate-50 ${
                idx < LANGUAGES.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-sm text-slate-900">{lang.label}</span>
              {profile?.language === lang.code && (
                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Specialty selector */}
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Specialty</p>
          </div>
          <div className="px-4 py-2">
            <select
              value={profile?.specialty ?? ''}
              onChange={(e) => updatePreference('specialty', e.target.value)}
              disabled={savingPref}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select your specialty</option>
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {currentSpecialty && (
              <p className="mt-1.5 text-xs text-slate-500">
                Current: {currentSpecialty.label}
              </p>
            )}
          </div>
        </div>

        {/* Menu items */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {menuItems.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 ${
                idx < menuItems.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              {item.icon}
              <span className="flex-1 text-sm text-slate-900">{item.label}</span>
              <svg
                className="h-4 w-4 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
          <button
            onClick={openCrispChat}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left active:bg-slate-50"
          >
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            <span className="flex-1 text-sm text-slate-900">Help &amp; Support</span>
            <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-red-500 shadow-sm transition-colors active:bg-slate-50 disabled:opacity-60"
        >
          {signingOut ? 'Signing Out...' : 'Sign Out'}
        </button>

        {/* Delete account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 text-xs text-slate-400 underline"
          >
            Delete Account
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700">Delete your account?</p>
            <p className="text-xs text-red-600">This will permanently delete your account and all associated data. This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm text-slate-600 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
