'use client';
/* eslint-disable @next/next/no-img-element */

import { Camera, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import type { CollectionPhoto } from '@/lib/collection-photos';
import type { PendingCollectionPhoto } from '@/lib/collection-photo-client';

type CollectionPhotoPickerProps = {
  existingPhotos: CollectionPhoto[];
  pendingPhotos: PendingCollectionPhoto[];
  onFilesSelected: (files: File[]) => void;
  onRemoveExisting?: (photoId: string) => void;
  onRemovePending: (pendingId: string) => void;
  disabled?: boolean;
  helperText?: string;
};

export function CollectionPhotoPicker({
  existingPhotos,
  pendingPhotos,
  onFilesSelected,
  onRemoveExisting,
  onRemovePending,
  disabled = false,
  helperText = 'Add up to 10 photos. The first photo becomes the cover used across your collection.',
}: CollectionPhotoPickerProps) {
  const inputId = useId();
  const hasPhotos = existingPhotos.length > 0 || pendingPhotos.length > 0;

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className="group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded border border-dashed border-ink-600 bg-gradient-to-br from-white to-slate-50 p-5 text-left shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-brand-300"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Add collection photos"
          disabled={disabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              onFilesSelected(files);
            }
            event.currentTarget.value = '';
          }}
        />
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-brand-500 text-white ">
            <Camera className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold tracking-tight text-ash-50">
              {hasPhotos ? 'Add more photos' : 'Add photos'}
            </p>
            <p className="max-w-2xl text-sm leading-6 text-ash-300">
              Upload front, back, slab, and detail shots. On phones, you can select several images in one pass.
            </p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-4 py-2 text-sm font-medium text-ash-100 transition-colors group-hover:bg-ink-800">
          <Plus className="h-4 w-4" />
          Choose photos
        </div>
      </label>

      {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {existingPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded border border-ink-700 bg-ink-900 "
            >
              <div className="relative aspect-[3/4] bg-ink-800">
                <img src={photo.imageUrl} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                {onRemoveExisting ? (
                  <button
                    type="button"
                    onClick={() => onRemoveExisting(photo.id)}
                    disabled={disabled}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/95 text-ash-200 shadow-sm transition hover:bg-ink-900 disabled:opacity-60"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-ash-400">
                <span>{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span>
                <span>Saved</span>
              </div>
            </div>
          ))}

          {pendingPhotos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded border border-brand-700/50 bg-brand-900/20 "
            >
              <div className="relative aspect-[3/4] bg-ink-800">
                <img src={photo.previewUrl} alt={photo.file.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePending(photo.id)}
                  disabled={disabled}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/95 text-ash-200 shadow-sm transition hover:bg-ink-900 disabled:opacity-60"
                  aria-label={`Remove pending photo ${photo.file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-500">
                <span className="truncate">{photo.file.name}</span>
                <span>Pending</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-ash-400">{helperText}</p>
    </div>
  );
}
