import Link from 'next/link';

interface Props {
  searchParams: Promise<{ type?: string; mobile?: string }>;
}

export default async function LinkExpiredPage({ searchParams }: Props) {
  const { type, mobile } = await searchParams;
  const isRecovery = type === 'recovery';
  const isMobile = mobile === '1';

  const forgotHref = isMobile ? '/m/forgot-password' : '/forgot-password';
  const loginHref = isMobile ? '/m/login' : '/login';
  const signupHref = isMobile ? '/m/signup' : '/signup';

  const heading = isRecovery
    ? 'Reset link expired'
    : 'Email link expired';

  const description = isRecovery
    ? 'This password reset link has expired or has already been used. Request a new one to continue.'
    : 'This link has expired or has already been used. Email links can only be used once and are valid for one hour.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-center text-xl font-bold text-slate-900">{heading}</h1>
        <p className="mt-2 text-center text-sm text-slate-500">{description}</p>

        <div className="mt-6 space-y-3">
          {isRecovery ? (
            <Link
              href={forgotHref}
              className="block w-full rounded-xl bg-amber-500 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
            >
              Request a new reset link
            </Link>
          ) : (
            <Link
              href={signupHref}
              className="block w-full rounded-xl bg-amber-500 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
            >
              Sign up again
            </Link>
          )}

          <Link
            href={loginHref}
            className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
