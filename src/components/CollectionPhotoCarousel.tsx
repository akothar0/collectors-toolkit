'use client';
/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CollectionPhoto } from '@/lib/collection-photos';

const SWIPE_THRESHOLD_PX = 40;

export function CollectionPhotoCarousel({
  photos,
  alt,
  onRemovePhoto,
}: {
  photos: CollectionPhoto[];
  alt: string;
  onRemovePhoto?: (photoId: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(i => Math.min(i, Math.max(photos.length - 1, 0)));
  }, [photos.length]);

  function goTo(index: number) {
    if (photos.length === 0) return;
    setActiveIndex((index + photos.length) % photos.length);
  }

  function handleSwipeEnd(clientX: number) {
    if (swipeStartX.current == null || photos.length <= 1) { swipeStartX.current = null; return; }
    const delta = clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(activeIndex + (delta < 0 ? 1 : -1));
  }

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded border border-rule bg-surface-2 text-ink-4">
        <span className="font-mono text-[11px]">No photos</span>
      </div>
    );
  }

  const active = photos[activeIndex];

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded border border-rule bg-surface-2"
        onPointerDown={e => { swipeStartX.current = e.clientX; }}
        onPointerUp={e => handleSwipeEnd(e.clientX)}
        onPointerCancel={() => { swipeStartX.current = null; }}
      >
        <img src={active.imageUrl} alt={alt} className="aspect-[3/4] w-full object-cover" />
        {onRemovePhoto && !active.id.startsWith('legacy-') ? (
          <button
            type="button"
            onClick={() => onRemovePhoto(active.id)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink-2 hover:text-negative"
            aria-label="Remove photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft hover:bg-surface">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft hover:bg-surface">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 right-3 rounded bg-ink/70 px-2 py-px font-mono text-[10px] text-paper">
              {activeIndex + 1} / {photos.length}
            </div>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <button key={photo.id} type="button" onClick={() => goTo(i)} aria-label={`Photo ${i + 1}`}
              className={`overflow-hidden rounded border transition ${i === activeIndex ? 'border-ink' : 'border-rule'}`}>
              <img src={photo.imageUrl} alt="" className="h-14 w-10 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
