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
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
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
    if (!file) { clearSelection(); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setFileName(file.name);
    setWarning(file.size > maxSizeMB * 1024 * 1024 ? `File exceeds ${maxSizeMB} MB — upload may fail.` : '');
    onImageSelected(file, nextPreviewUrl);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="group relative block cursor-pointer overflow-hidden rounded border border-dashed border-ink-600 bg-ink-800 p-5 hover:border-ink-500"
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          capture="environment"
          className="sr-only"
          aria-label="Upload photo"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="relative z-0 grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
            <div className="overflow-hidden rounded border border-ink-700 bg-ink-900">
              <img src={previewUrl} alt="Selected photo preview" className="h-40 w-full object-cover sm:h-32" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-ash-100">{fileName}</p>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearSelection();
                }}
                className="relative z-20 inline-flex items-center gap-2 rounded border border-ink-600 px-3 py-1.5 text-sm font-medium text-ash-300 hover:border-ink-500 hover:text-ash-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-0 flex min-h-[120px] flex-col justify-center gap-3">
            <Camera className="h-5 w-5 text-ash-500" />
            <p className="text-sm font-medium text-ash-300">Tap to upload or take a photo</p>
            <p className="text-xs text-ash-500">Keep the cert number visible · Avoid glare</p>
          </div>
        )}
      </label>

      {warning ? (
        <p className="text-xs text-amber-400">{warning}</p>
      ) : null}
    </div>
  );
}
