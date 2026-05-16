'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { Camera, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

type ImageUploadProps = {
  onImageSelected: (file: File | null, previewUrl: string) => void;
  accept?: string;
  maxSizeMB?: number;
};

export function ImageUpload({
  onImageSelected,
  accept = 'image/*',
  maxSizeMB = 10,
}: ImageUploadProps) {
  const inputId = useId();
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function clearSelection() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setPreviewUrl('');
    setFileName('');
    setWarning('');
    onImageSelected(null, '');
  }

  function handleFile(file: File | null) {
    if (!file) {
      clearSelection();
      return;
    }

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setFileName(file.name);
    setWarning(file.size > maxSizeMB * 1024 * 1024 ? `This file is larger than ${maxSizeMB}MB. Uploads that large may fail.` : '');
    onImageSelected(file, nextPreviewUrl);
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="group relative block overflow-hidden rounded-[1.75rem] border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 p-6 text-left shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition-colors hover:border-brand-300"
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          capture="environment"
          className="sr-only"
          aria-label="Upload slab photo"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="relative z-0 grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img src={previewUrl} alt="Selected slab preview" className="h-52 w-full object-cover" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-600">Selected image</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{fileName}</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Your upload is ready for cert detection. If the label is small, reshoot with the slab flat and the camera centered on the label.
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearSelection();
                }}
                className="relative z-20 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Remove image
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-0 flex min-h-[260px] flex-col justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
              <Camera className="h-6 w-6" />
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">Upload a slab photo</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Drag and drop a clear label shot, or tap to open your camera. Keep the cert number visible and avoid glare on the case.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">Good lighting</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Label in focus</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Slab flat</span>
            </div>
          </div>
        )}
      </label>

      {warning ? <p className="text-sm text-amber-700">{warning}</p> : <p className="text-sm text-slate-500">Tip: the label is easier to read when the barcode and cert number fill most of the frame.</p>}
    </div>
  );
}
