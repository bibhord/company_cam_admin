import Link from 'next/link';

const PRO_FEATURES = [
  'Unlimited photos',
  'Unlimited projects',
  '15 team members',
  'PDF reports',
  'Public portfolio site',
  'Priority support',
];

export default function MobileUpgradePage() {
  const checkoutUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO;
  const ctaHref = checkoutUrl || 'mailto:hello@captureyourwork.com?subject=Upgrade to Pro';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Upgrade to Pro</h1>
          <p className="mt-1 text-sm text-slate-500">Capture your work without limits.</p>
        </div>

        <div className="rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900">$79</span>
            <span className="text-sm text-slate-500">/month</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Cancel anytime</p>

          <ul className="mt-5 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={ctaHref}
            className="mt-6 block rounded-xl bg-amber-500 py-3 text-center text-sm font-semibold text-white shadow-sm active:bg-amber-600"
          >
            {checkoutUrl ? 'Upgrade now' : 'Contact us to upgrade'}
          </a>
        </div>

        <div className="mt-6 text-center">
          <Link href="/m/projects" className="text-sm text-slate-400 hover:text-slate-600">
            ← Back to projects
          </Link>
        </div>
      </div>
    </div>
  );
}
