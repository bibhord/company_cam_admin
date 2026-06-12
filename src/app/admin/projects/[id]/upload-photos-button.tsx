'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n';

type Bucket = 'before' | 'after' | null;

export function UploadPhotosButton({ projectId }: { projectId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bucket, setBucket] = useState<Bucket>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<Array<{ name: string; reason: string; sizeMB: string }>>([]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setFailures([]);
    setProgress({ done: 0, total: files.length });

    const newFailures: Array<{ name: string; reason: string; sizeMB: string }> = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectId', projectId);
      if (bucket) fd.append('bucket', bucket);
      try {
        const res = await fetch('/api/m/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          let reason = `HTTP ${res.status}`;
          try {
            const data = await res.json();
            if (data?.error) reason = data.error;
          } catch {
            const text = await res.text().catch(() => '');
            if (text) reason = text.slice(0, 200);
          }
          if (res.status === 413) reason = `File too large (${sizeMB} MB) — server limit ~4.5 MB`;
          throw new Error(reason);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        newFailures.push({ name: file.name, reason, sizeMB });
        console.error('Upload failed for', file.name, err);
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    setProgress(null);
    setFailures(newFailures);
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  const bucketOptions: { value: Bucket; label: string }[] = [
    { value: null, label: t('admin.projectDetail.unset') },
    { value: 'before', label: t('admin.projectDetail.before') },
    { value: 'after', label: t('admin.projectDetail.after') },
  ];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {bucketOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setBucket(opt.value)}
              disabled={uploading}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                bucket === opt.value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
        >
          {uploading && progress ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('admin.projectDetail.uploading').replace('{{done}}', String(progress.done)).replace('{{total}}', String(progress.total))}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12M12 7.5v9" />
              </svg>
              {t('admin.projectDetail.uploadPhotos')}
            </>
          )}
        </button>
      </div>
      {failures.length > 0 && (
        <div className="mt-1 w-72 rounded-lg border border-red-200 bg-red-50 p-3 text-left">
          <p className="text-xs font-semibold text-red-700">
            {t('admin.projectDetail.uploadFailed').replace('{{count}}', String(failures.length))}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {failures.map((f, i) => (
              <li key={i} className="text-[11px] leading-tight text-red-700">
                <span className="font-medium">{f.name}</span>
                <span className="text-red-500"> · {f.sizeMB} MB</span>
                <div className="text-red-600">{f.reason}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
