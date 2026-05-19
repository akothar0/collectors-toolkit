'use client';
/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CollectionPhoto } from '@/lib/collection-photos';

type CollectionPhotoCarouselProps = {
  photos: CollectionPhoto[];
  alt: string;
};

const SWIPE_THRESHOLD_PX = 40;

export function CollectionPhotoCarousel({ photos, alt }: CollectionPhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(photos.length - 1, 0)));
  }, [photos.length]);

  function goTo(index: number) {
    if (photos.length === 0) {
      return;
    }

    const normalized = (index + photos.length) % photos.length;
    setActiveIndex(normalized);
  }

  function handleSwipeEnd(clientX: number) {
    if (swipeStartX.current == null || photos.length <= 1) {
      swipeStartX.current = null;
      return;
    }

    const delta = clientX - swipeStartX.current;
    swipeStartX.current = null;

    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) {
      return;
    }

    goTo(activeIndex + (delta < 0 ? 1 : -1));
  }

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center text-slate-300">
        <CreditCard className="h-16 w-16" />
      </div>
    );
  }

  const activePhoto = photos[activeIndex];

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-soft"
        onPointerDown={(event) => {
          swipeStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          handleSwipeEnd(event.clientX);
        }}
        onPointerCancel={() => {
          swipeStartX.current = null;
        }}
      >
        <img src={activePhoto.imageUrl} alt={alt} className="aspect-[3/4] w-full object-cover" />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm transition hover:bg-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm transition hover:bg-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 right-4 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white">
              {activeIndex + 1} / {photos.length}
            </div>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => goTo(index)}
              className={`overflow-hidden rounded-xl border transition ${
                index === activeIndex
                  ? 'border-brand-500 ring-2 ring-brand-200'
                  : 'border-slate-200'
              }`}
              aria-label={`Show photo ${index + 1}`}
            >
              <img src={photo.imageUrl} alt="" className="h-16 w-12 object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
