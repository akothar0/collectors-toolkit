// handoff/components/Slab.tsx
//
// Drop into: src/components/Slab.tsx
//
// CSS-only graded-slab placeholder. Renders as PSA / BGS / SGC / Raw at any
// size with one component. Used in scanner results, collection grids,
// portfolio top-cards, recent-activity, set tracker — anywhere a card thumbnail
// would otherwise need an uploaded photo.
//
// Future: when a real image_url is present, render that inside the .card-window
// instead of the gradient + silhouette.

import * as React from 'react';

export type SlabHolding = {
  player: string;
  year: number;
  set: string;
  num?: string | null;
  grade: string;           // e.g. 'PSA 10', 'BGS 9', 'SGC 10', 'Raw'
  sport?: string | null;   // 'NBA' | 'NFL' | 'MLB' | 'WNBA' | null
  tint?: string;           // hex — card-window background
  accent?: string;         // hex — surname color (defaults to white-ish)
  imageUrl?: string | null;
};

export type SlabProps = {
  holding: SlabHolding;
  width?: number;
  height?: number;
  flavor?: 'light' | 'dark';
  showLabel?: boolean;
  tilt?: number;            // degrees
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

const PSA_RED  = '#c41e3a';
const BGS_NAVY = '#101935';
const SGC_BLUE = '#1d3e8b';

function darken(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function lastName(name: string): string {
  return name.split(' ').slice(-1)[0];
}

export function Slab({
  holding,
  width = 168,
  height = 252,
  flavor = 'light',
  showLabel = true,
  tilt = 0,
  onClick,
  className,
  style,
}: SlabProps) {
  const isPSA = holding.grade.startsWith('PSA');
  const isBGS = holding.grade.startsWith('BGS');
  const isSGC = holding.grade.startsWith('SGC');
  const isRaw = holding.grade === 'Raw';

  const labelBg = isPSA ? PSA_RED : isBGS ? BGS_NAVY : isSGC ? SGC_BLUE : '#222';
  const labelText = isPSA ? 'PSA' : isBGS ? 'BGS' : isSGC ? 'SGC' : 'RAW';
  const gradeNum = holding.grade.replace(/PSA|BGS|SGC|\s/g, '');
  const tint = holding.tint || '#2d2e34';
  const accent = holding.accent || '#f4f4f1';

  const plasticGrad = flavor === 'dark'
    ? 'linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 60%, #232325 100%)'
    : 'linear-gradient(160deg, #ffffff 0%, #ecebe7 55%, #f7f5ef 100%)';
  const plasticShadow = flavor === 'dark'
    ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 28px rgba(0,0,0,0.45)'
    : '0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.04) inset, 0 8px 22px rgba(20,17,13,0.10), 0 2px 6px rgba(20,17,13,0.06)';
  const plasticBorder = flavor === 'dark'
    ? '1px solid #303033'
    : '1px solid rgba(20,17,13,0.06)';

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        width, height, position: 'relative',
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        transition: 'transform .25s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* 1 · plastic case */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: width * 0.04,
        background: plasticGrad, boxShadow: plasticShadow, border: plasticBorder,
      }} />

      {/* 2 · label band */}
      {showLabel && !isRaw && (
        <div style={{
          position: 'absolute', top: width * 0.04, left: width * 0.04, right: width * 0.04,
          height: height * 0.11, background: labelBg, borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px', color: '#fff',
          fontFamily: 'var(--ct-sans)', fontWeight: 700, fontSize: width * 0.058,
          letterSpacing: 0.6, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.18)',
        }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span>{labelText}</span>
            <span style={{ fontSize: width * 0.078, fontWeight: 800 }}>{gradeNum}</span>
          </span>
          <span style={{ fontSize: width * 0.044, opacity: 0.85 }}>
            {gradeNum === '10' ? 'GEM MT' : gradeNum === '9' ? 'MINT' : 'NM/MT'}
          </span>
        </div>
      )}
      {showLabel && isRaw && (
        <div style={{
          position: 'absolute', top: width * 0.04, left: width * 0.04, right: width * 0.04,
          height: height * 0.06,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 6px',
          fontFamily: 'var(--ct-mono)', fontSize: width * 0.044,
          letterSpacing: 1.2, color: flavor === 'dark' ? '#a09c92' : '#8a867b',
        }}>
          <span>RAW · UNGRADED</span>
        </div>
      )}

      {/* 3 · card window */}
      <div style={{
        position: 'absolute',
        top: showLabel ? (isRaw ? height * 0.10 : height * 0.18) : height * 0.04,
        left: width * 0.08, right: width * 0.08, bottom: height * 0.10,
        background: holding.imageUrl
          ? `url(${holding.imageUrl}) center/cover, ${tint}`
          : `linear-gradient(180deg, ${tint} 0%, ${tint}cc 55%, ${darken(tint, 0.35)} 100%)`,
        borderRadius: 2, overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}>
        {!holding.imageUrl && (
          <>
            {/* refractor sheen */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(115deg, transparent 0%, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%, transparent 100%)',
            }}/>
            {/* radial spotlight */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 70% 50% at 50% 62%, rgba(0,0,0,0.45), transparent 72%)',
            }}/>
            {/* player silhouette */}
            <div style={{
              position: 'absolute', left: '50%', bottom: '22%', transform: 'translateX(-50%)',
              width: '38%', height: '52%',
            }}>
              <div style={{
                position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
                width: '38%', aspectRatio: '1', borderRadius: '50%',
                background: 'rgba(0,0,0,0.42)',
              }}/>
              <div style={{
                position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
                width: '100%', height: '64%',
                background: 'rgba(0,0,0,0.42)',
                borderRadius: '46% 46% 6% 6% / 60% 60% 8% 8%',
              }}/>
            </div>
            {/* surname */}
            <div style={{
              position: 'absolute', bottom: 6, left: 8, right: 8,
              color: accent, fontFamily: 'var(--ct-serif)',
              fontSize: width * 0.10, fontStyle: 'italic', lineHeight: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.55)',
            }}>{lastName(holding.player)}</div>
          </>
        )}
        {/* 4 · sport tag */}
        {holding.sport && (
          <div style={{
            position: 'absolute', top: 6, left: 8,
            color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--ct-mono)',
            fontSize: width * 0.042, fontWeight: 500, letterSpacing: 1,
          }}>{holding.sport}</div>
        )}
        {/* 5 · card number */}
        {holding.num && (
          <div style={{
            position: 'absolute', top: 6, right: 8,
            color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--ct-mono)',
            fontSize: width * 0.05, fontWeight: 600, letterSpacing: 0.4,
          }}>{holding.num}</div>
        )}
      </div>

      {/* 6 · bottom band */}
      <div style={{
        position: 'absolute', bottom: 0, left: width * 0.08, right: width * 0.08,
        height: height * 0.10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: flavor === 'dark' ? '#a09c92' : '#3a3a35',
        fontFamily: 'var(--ct-mono)', fontSize: width * 0.042,
        letterSpacing: 0.6, fontWeight: 500,
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {holding.year} {holding.set.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
