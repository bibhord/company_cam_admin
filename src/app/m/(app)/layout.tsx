import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Metadata, Viewport } from 'next';
import { BottomNav } from './components/bottom-nav';
import { ServiceWorkerRegister } from './components/service-worker-register';
import { VersionCheck } from './components/version-check';
import { NotificationPrompt } from './components/notification-prompt';
import { LocaleWrapper } from './components/locale-wrapper';

interface ProfileRecord {
  org_id: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  language: string | null;
  onboarding_complete: boolean | null;
  is_active: boolean;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CaptureYourWork Mobile',
  description: 'Capture and organize job site photos on the go.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CaptureYourWork',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F59E0B',
};

export default async function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/m/login');
  }

  // Fetch profile for locale and onboarding check
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, first_name, last_name, role, language, onboarding_complete, is_active')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  // Show pending approval screen if account not active
  if (profile && !profile.is_active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Account Pending Approval</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account has been created and is waiting for approval. You&apos;ll be notified once your account is activated.
        </p>
        <form action="/api/auth/logout" method="POST" className="mt-6">
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            Sign Out
          </button>
        </form>
      </div>
    );
  }

  // Redirect to onboarding if not complete
  if (!profile?.onboarding_complete) {
    redirect('/m/onboarding');
  }

  const locale = (profile?.language === 'es' ? 'es' : 'en') as 'en' | 'es';

  return (
    <LocaleWrapper locale={locale}>
    <div className="flex min-h-screen flex-col bg-slate-50">
      <VersionCheck />
      <NotificationPrompt />
      <ServiceWorkerRegister />
      <main className="flex-1 pb-16">
        {children}
      </main>
      <BottomNav />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `,
        }}
      />
    </div>
    </LocaleWrapper>
  );
}
