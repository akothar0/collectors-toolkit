'use client';
/* eslint-disable @next/next/no-img-element */

import { Camera, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import type { CollectionPhoto } from '@/lib/collection-photos';
import type { PendingCollectionPhoto } from '@/lib/collection-photo-client';
import { Eyebrow } from '@/components/editorial';

type CollectionPhotoPickerProps = {
  existingPhotos: CollectionPhoto[];
  pendingPhotos: PendingCollectionPhoto[];
  onFilesSelected: (files: File[]) => void;
  onRemoveExisting?: (photoId: string) => void;
  onRemovePending: (pendingId: string) => void;
  disabled?: boolean;
  helperText?: string;
  variant?: 'default' | 'compact';
};

export function CollectionPhotoPicker({
  existingPhotos, pendingPhotos, onFilesSelected, onRemoveExisting,
  onRemovePending, disabled = false,
  helperText = 'Add up to 10 photos. The first photo becomes the cover used across your collection.',
  variant = 'default',
}: CollectionPhotoPickerProps) {
  const inputId = useId();
  const hasPhotos = existingPhotos.length > 0 || pendingPhotos.length > 0;

  if (variant === 'compact') {
    return (
      <div className="space-y-3">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-rule px-3 py-2 font-mono text-[11px] text-ink-2 hover:border-ink hover:text-ink"
        >
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label="Add collection photos"
            disabled={disabled}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) onFilesSelected(files);
              e.currentTarget.value = '';
            }}
          />
          <Camera className="h-3.5 w-3.5" />
          {hasPhotos ? 'Add more photos' : 'Add photos'}
        </label>
        {pendingPhotos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pendingPhotos.map((photo) => (
              <div key={photo.id} className="relative h-16 w-12 overflow-hidden rounded border border-accent/30">
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePending(photo.id)}
                  disabled={disabled}
                  className="absolute right-0.5 top-0.5 rounded-full bg-surface/90 p-0.5 text-ink-3 hover:text-negative"
                  aria-label="Remove pending photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {helperText ? <p className="text-[12px] text-ink-3">{helperText}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label htmlFor={inputId}
        className="flex cursor-pointer flex-col gap-4 rounded border border-rule bg-surface p-5 hover:bg-surface-2 transition-colors">
        <input id={inputId} type="file" accept="image/*" multiple className="sr-only"
          aria-label="Add collection photos" disabled={disabled}
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onFilesSelected(files);
            e.currentTarget.value = '';
          }} />
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-surface-2 text-ink-2">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-ink">
              {hasPhotos ? 'Add more photos' : 'Add photos'}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-2">
              Upload front, back, slab, and detail shots. Select several at once.
            </p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded border border-rule px-3 py-1.5 font-mono text-[11px] text-ink-3 hover:border-ink hover:text-ink transition-colors">
          <Plus className="h-3 w-3" /> Choose photos
        </div>
      </label>

      {hasPhotos && (
        <div className="grid gap-3 sm:grid-cols-3">
          {existingPhotos.map((photo, i) => (
            <div key={photo.id} className="overflow-hidden rounded border border-rule bg-surface">
              <div className="relative aspect-[3/4] bg-surface-2">
                <img src={photo.imageUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {onRemoveExisting && (
                  <button type="button" onClick={() => onRemoveExisting(photo.id)} disabled={disabled}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink-2 hover:text-negative disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <Eyebrow>{i === 0 ? 'Cover photo' : `Photo ${i + 1}`}</Eyebrow>
                <Eyebrow tone="positive">Saved</Eyebrow>
              </div>
            </div>
          ))}

          {pendingPhotos.map(photo => (
            <div key={photo.id} className="overflow-hidden rounded border border-accent/30 bg-accent/5">
              <div className="relative aspect-[3/4] bg-surface-2">
                <img src={photo.previewUrl} alt={photo.file.name} className="h-full w-full object-cover" />
                <button type="button" onClick={() => onRemovePending(photo.id)} disabled={disabled}
                  aria-label={`Remove ${photo.file.name}`}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink-2 hover:text-negative disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="truncate font-mono text-[10px] text-ink-3">{photo.file.name}</span>
                <Eyebrow tone="warn">Pending</Eyebrow>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[13px] text-ink-3">{helperText}</p>
    </div>
  );
}
