import Link from 'next/link';

const PRO_FEATURES = [
  'Unlimited photos',
  'Unlimited projects',
  '15 team members',
  'GPS photo tagging',
  'PDF reports with watermarking',
  'Checklist templates',
  'Public portfolio site',
  'Priority email support',
];

export default function UpgradePage() {
  const checkoutUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO;
  const ctaHref = checkoutUrl || 'mailto:hello@captureyourwork.com?subject=Upgrade to Pro';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Upgrade to Pro</h1>
          <p className="mt-2 text-slate-500">Everything you need to document your work without limits.</p>
        </div>

        <div className="rounded-2xl border-2 border-amber-400 bg-white p-8 shadow-lg ring-2 ring-amber-400/20">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-slate-900">$79</span>
            <span className="text-sm text-slate-500">/month</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Billed monthly · Cancel anytime</p>

          <ul className="mt-6 space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={ctaHref}
            className="mt-8 block rounded-xl bg-amber-500 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            {checkoutUrl ? 'Upgrade now' : 'Contact us to upgrade'}
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Need something different?{' '}
          <a href="mailto:hello@captureyourwork.com" className="text-amber-600 hover:underline">
            Talk to us
          </a>{' '}
          &middot;{' '}
          <Link href="/admin/projects" className="text-slate-500 hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
