'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SPECIALTIES = [
  { value: 'general_contractor', label: 'General Contractor', icon: '🏗️' },
  { value: 'plumber', label: 'Plumber', icon: '🔧' },
  { value: 'electrician', label: 'Electrician', icon: '⚡' },
  { value: 'hvac', label: 'HVAC Technician', icon: '❄️' },
  { value: 'roofer', label: 'Roofer', icon: '🏠' },
  { value: 'painter', label: 'Painter', icon: '🎨' },
  { value: 'landscaper', label: 'Landscaper', icon: '🌿' },
  { value: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { value: 'mason', label: 'Mason', icon: '🧱' },
  { value: 'other', label: 'Other', icon: '🔨' },
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'specialty' | 'language'>('specialty');
  const [specialty, setSpecialty] = useState('');
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleComplete() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/m/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty, language }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">CaptureWork</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Let&apos;s get you<br />
            <span className="text-amber-400">set up.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Tell us a little about your work so we can customize your experience.
          </p>
        </div>
      </div>

      {/* Right panel — onboarding form */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <span className="text-slate-900 text-lg font-semibold tracking-tight">CaptureWork</span>
          </div>

          {/* Progress dots */}
          <div className="mb-8 flex items-center gap-2">
            <div className={`h-2 w-12 rounded-full transition-colors ${step === 'specialty' ? 'bg-amber-500' : 'bg-amber-200'}`} />
            <div className={`h-2 w-12 rounded-full transition-colors ${step === 'language' ? 'bg-amber-500' : 'bg-amber-200'}`} />
          </div>

          {step === 'specialty' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">What is your specialty?</h2>
                <p className="text-sm text-slate-500">This helps us tailor your experience.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSpecialty(s.value)}
                    className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-3 text-left text-sm font-medium transition-colors ${
                      specialty === s.value
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('language')}
                  className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
                >
                  Continue
                </button>
              </div>
              <button
                onClick={() => { setSpecialty(''); setStep('language'); }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
              >
                Skip for now
              </button>
            </div>
          )}

          {step === 'language' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Select your language</h2>
                <p className="text-sm text-slate-500">You can change this later in settings.</p>
              </div>
              <div className="space-y-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3.5 text-left transition-colors ${
                      language === lang.code
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className={`text-sm font-medium ${language === lang.code ? 'text-amber-700' : 'text-slate-700'}`}>
                      {lang.label}
                    </span>
                    {language === lang.code && (
                      <svg className="ml-auto h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('specialty')}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Get Started'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
