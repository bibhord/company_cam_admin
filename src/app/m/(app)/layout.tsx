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
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CaptureWork Mobile',
  description: 'Capture and organize job site photos on the go.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CaptureWork',
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
    .select('org_id, first_name, last_name, role, language, onboarding_complete')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

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
