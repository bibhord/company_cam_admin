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

  async function handleComplete() {
    setSaving(true);
    try {
      const res = await fetch('/api/m/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty, language }),
      });
      if (res.ok) {
        router.push('/m');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/20">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Welcome to CaptureWork</h1>
          <p className="mt-1 text-sm text-slate-500">Tell us about your work</p>
        </div>

        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'specialty' ? 'bg-amber-500' : 'bg-amber-200'}`} />
          <div className={`h-2 w-8 rounded-full transition-colors ${step === 'language' ? 'bg-amber-500' : 'bg-amber-200'}`} />
        </div>

        {step === 'specialty' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">What is your specialty?</h2>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpecialty(s.value)}
                  className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-left text-sm font-medium transition-colors ${
                    specialty === s.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="leading-tight">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setStep('language')}
                className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors active:bg-amber-600 disabled:opacity-60"
              >
                Continue
              </button>
            </div>
            <button
              onClick={() => { setSpecialty(''); setStep('language'); }}
              className="w-full text-center text-sm text-slate-400 active:text-slate-600"
            >
              Skip
            </button>
          </div>
        )}

        {step === 'language' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Select your language</h2>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${
                    language === lang.code
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white'
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

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setStep('specialty')}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors active:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition-colors active:bg-amber-600 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
