import Link from 'next/link';

export default function MobileUpgradePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Upgrade your plan</h1>
          <p className="mt-2 text-sm text-slate-500">Keep capturing your work without limits.</p>
        </div>

        <div className="space-y-4">
          {[
            { name: 'Starter', price: '$29/mo', photos: '2,500 photos', members: '5 members' },
            { name: 'Pro', price: '$79/mo', photos: 'Unlimited photos', members: '15 members', popular: true },
            { name: 'Business', price: '$149/mo', photos: 'Unlimited photos', members: 'Unlimited members' },
          ].map((plan) => (
            <a
              key={plan.name}
              href={`mailto:hello@captureyourwork.com?subject=Upgrade to ${plan.name}`}
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                plan.popular
                  ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{plan.name}</span>
                  {plan.popular && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">Popular</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {plan.photos} &middot; {plan.members}
                </p>
              </div>
              <span className="text-sm font-bold text-slate-800">{plan.price}</span>
            </a>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Tap a plan to contact us and get set up.
        </p>

        <div className="mt-6 text-center">
          <Link href="/m/projects" className="text-sm text-slate-400 hover:text-slate-600">
            ← Back to projects
          </Link>
        </div>
      </div>
    </div>
  );
}
