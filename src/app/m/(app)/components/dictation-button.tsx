'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Called once per finalized speech segment with the recognized text. */
  onTranscript: (text: string) => void;
  className?: string;
  /** Optional indicator for live (interim) transcript while the user speaks. */
  onInterim?: (text: string) => void;
}

type Ctor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    [index: number]: { transcript: string };
  }>;
}

function getRecognitionCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function DictationButton({ onTranscript, onInterim, className }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  function stop() {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setListening(false);
  }

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0]?.transcript ?? '';
        if (r.isFinal) {
          if (text.trim()) onTranscript(text.trim());
        } else {
          interim += text;
        }
      }
      if (onInterim) onInterim(interim);
    };
    rec.onerror = (e) => {
      const code = e?.error ?? '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone permission denied.');
      } else if (code === 'no-speech') {
        // benign — user paused
      } else if (code) {
        setError(`Speech error: ${code}`);
      }
      stop();
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (onInterim) onInterim('');
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start dictation.');
    }
  }

  useEffect(() => () => stop(), []);

  if (!supported) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-label={listening ? 'Stop dictation' : 'Start dictation'}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
          listening
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50'
        }`}
      >
        {listening ? (
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        )}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
