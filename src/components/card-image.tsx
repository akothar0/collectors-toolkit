'use client';

import Image from 'next/image';

function imageHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function CardImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  if (!src?.trim()) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-2 text-xs text-ink-3 ${className ?? ''}`}
      >
        No image
      </div>
    );
  }

  const host = imageHostname(src);
  const unoptimized = !host;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized={unoptimized}
        className={`object-cover ${className ?? ''}`}
        sizes="(max-width: 768px) 50vw, 200px"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 160}
      height={height ?? 224}
      unoptimized={unoptimized}
      className={`object-cover ${className ?? ''}`}
    />
  );
}
