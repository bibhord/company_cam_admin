import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For small crews just getting started.',
    features: [
      '2,500 photos / month',
      '5 team members',
      'Unlimited projects',
      'PDF reports',
      'GPS photo tagging',
      'Email support',
    ],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/month',
    description: 'For growing contractors who need more.',
    features: [
      'Unlimited photos',
      '15 team members',
      'Unlimited projects',
      'PDF reports + watermarking',
      'GPS photo tagging',
      'Checklist templates',
      'Priority support',
    ],
    highlight: true,
  },
  {
    name: 'Business',
    price: '$149',
    period: '/month',
    description: 'For larger operations and multiple crews.',
    features: [
      'Unlimited photos',
      'Unlimited team members',
      'Unlimited projects',
      'All Pro features',
      'Client sharing links',
      'Dedicated support',
    ],
    highlight: false,
  },
];

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Choose a plan</h1>
          <p className="mt-2 text-slate-500">Upgrade to keep capturing and protecting your work.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.highlight
                  ? 'border-amber-400 bg-white shadow-lg ring-2 ring-amber-400'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.highlight && (
                <div className="mb-4 self-start rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-700">
                  Most popular
                </div>
              )}
              <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:hello@captureyourwork.com?subject=Upgrade to ${plan.name}`}
                className={`mt-8 block rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                  plan.highlight
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                Get started
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Questions?{' '}
          <a href="mailto:hello@captureyourwork.com" className="text-amber-600 hover:underline">
            hello@captureyourwork.com
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
