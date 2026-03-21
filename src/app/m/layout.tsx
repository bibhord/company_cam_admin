import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Metadata, Viewport } from 'next';
import { BottomNav } from './components/bottom-nav';
import { ServiceWorkerRegister } from './components/service-worker-register';

interface ProfileRecord {
  org_id: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export const metadata: Metadata = {
  title: 'PhotoDoc Mobile',
  description: 'Capture and organize job site photos on the go.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PhotoDoc',
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
    redirect('/login');
  }

  // Fetch profile for future use (org scoping, role checks)
  await supabase
    .from('profiles')
    .select('org_id, first_name, last_name, role')
    .eq('user_id', user.id)
    .maybeSingle<ProfileRecord>();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
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
  );
}
