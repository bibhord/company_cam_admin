'use client';

import { useState } from 'react';
import { PhotoCard } from '../../photo-card';
import type { PhotoRecord } from '../../types';
import { useLocale } from '@/lib/i18n';

type BucketFilter = 'all' | 'before' | 'after' | 'unset';

export function PhotosFilter({
  photos,
  canEdit,
  emptyMessage,
}: {
  photos: PhotoRecord[];
  canEdit: boolean;
  emptyMessage: string;
}) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<BucketFilter>('all');

  const counts = {
    all: photos.length,
    before: photos.filter((p) => p.bucket === 'before').length,
    after: photos.filter((p) => p.bucket === 'after').length,
    unset: photos.filter((p) => !p.bucket).length,
  };

  const filtered = photos.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'unset') return !p.bucket;
    return p.bucket === filter;
  });

  const tabs: { value: BucketFilter; label: string }[] = [
    { value: 'all', label: `${t('admin.projectDetail.allPhotos')} (${counts.all})` },
    { value: 'before', label: `${t('admin.projectDetail.before')} (${counts.before})` },
    { value: 'after', label: `${t('admin.projectDetail.after')} (${counts.after})` },
  ];
  if (counts.unset > 0) {
    tabs.push({ value: 'unset', label: `${t('admin.projectDetail.unset')} (${counts.unset})` });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === tab.value
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} canEdit={canEdit} />
          ))}
        </div>
      )}
    </>
  );
}
