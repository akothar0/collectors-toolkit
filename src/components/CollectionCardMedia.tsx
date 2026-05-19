'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { CollectionPhotoCarousel } from '@/components/CollectionPhotoCarousel';
import { CollectionPhotoPicker } from '@/components/CollectionPhotoPicker';
import { Slab, type SlabHolding } from '@/components/Slab';
import type { CollectionPhoto } from '@/lib/collection-photos';
import type { PendingCollectionPhoto } from '@/lib/collection-photo-client';

type CollectionCardMediaProps = {
  photos: CollectionPhoto[];
  pendingPhotos: PendingCollectionPhoto[];
  heroSlab: SlabHolding;
  alt: string;
  disabled?: boolean;
  photoUploading?: boolean;
  onFilesSelected: (files: File[]) => void;
  onRemoveExisting?: (photoId: string) => void;
  onRemovePending: (pendingId: string) => void;
  onUploadPending?: () => void;
};

export function CollectionCardMedia({
  photos,
  pendingPhotos,
  heroSlab,
  alt,
  disabled = false,
  photoUploading = false,
  onFilesSelected,
  onRemoveExisting,
  onRemovePending,
  onUploadPending,
}: CollectionCardMediaProps) {
  const hasPhotos = photos.length > 0;

  let hero: ReactNode;
  if (hasPhotos) {
    hero = (
      <CollectionPhotoCarousel photos={photos} alt={alt} onRemovePhoto={onRemoveExisting} />
    );
  } else {
    hero = (
      <div className="flex justify-center">
        <Slab holding={heroSlab} width={250} height={375} flavor="light" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hero}
      <CollectionPhotoPicker
        variant="compact"
        existingPhotos={[]}
        pendingPhotos={pendingPhotos}
        onFilesSelected={onFilesSelected}
        onRemovePending={onRemovePending}
        disabled={disabled}
        helperText={
          hasPhotos
            ? 'First photo is the cover across your collection.'
            : 'Add slab, front, back, and detail shots.'
        }
      />
      {pendingPhotos.length > 0 && onUploadPending ? (
        <button
          type="button"
          onClick={onUploadPending}
          disabled={disabled || photoUploading}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
        >
          {photoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Upload selected photos
        </button>
      ) : null}
    </div>
  );
}
