// handoff/components/editorial.tsx
//
// Drop into: src/components/editorial.tsx
//
// Editorial atoms used across every surface. These map the design tokens to
// Tailwind v3 classes (defined in tailwind.config.ts — see handoff/tailwind.config.ts).
//
// Imports: Eyebrow · Rule · StatStrip / StatCell · Masthead · Button

import * as React from 'react';
import { cn } from '@/lib/cn'; // optional className combiner; inline `clsx` works too

// ── Eyebrow ──────────────────────────────────────────────────────────────
// Small caps monospace label. Used above every section title.
type EyebrowProps = {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'positive' | 'negative' | 'warn';
  className?: string;
};
const TONE_CLASS: Record<NonNullable<EyebrowProps['tone']>, string> = {
  default:  'text-ink-3',
  accent:   'text-accent',
  positive: 'text-positive',
  negative: 'text-negative',
  warn:     'text-warn',
};
export function Eyebrow({ children, tone = 'default', className }: EyebrowProps) {
  return (
    <div className={cn(
      'font-mono text-[10px] uppercase tracking-[0.18em]',
      TONE_CLASS[tone],
      className,
    )}>
      {children}
    </div>
  );
}

// ── Rule ─────────────────────────────────────────────────────────────────
type RuleProps = { soft?: boolean; className?: string };
export function Rule({ soft, className }: RuleProps) {
  return <div className={cn('h-px', soft ? 'bg-rule-soft' : 'bg-rule', className)} />;
}

// ── StatCell / StatStrip ─────────────────────────────────────────────────
type StatCellProps = {
  label: string;
  value: React.ReactNode;
  italic?: boolean;
  delta?: number;
  deltaPct?: number;
  sub?: string;
  big?: boolean;
};

const fmtMoney = (n: number) =>
  (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US');

export function StatCell({ label, value, italic, delta, deltaPct, sub, big }: StatCellProps) {
  const isPositive = delta != null && delta >= 0;
  return (
    <div className="flex-1 px-6 py-5 border-r border-rule last:border-r-0">
      <Eyebrow>{label}</Eyebrow>
      <div className={cn(
        'font-serif mt-3 text-ink leading-none tracking-tight',
        big ? 'text-[56px]' : 'text-[44px]',
        italic && 'italic',
      )}>{value}</div>
      <div className="mt-2.5 flex items-center gap-2.5">
        {delta != null && (
          <div className={cn(
            'font-mono text-[11px] flex items-center gap-1',
            isPositive ? 'text-positive' : 'text-negative',
          )}>
            {isPositive ? '↗' : '↘'} {fmtMoney(delta)}
            {deltaPct != null && (
              <span className="text-ink-3 ml-1">· {(deltaPct >= 0 ? '+' : '−') + Math.abs(deltaPct).toFixed(1) + '%'}</span>
            )}
          </div>
        )}
        {sub && <div className="font-mono text-[11px] text-ink-3">{sub}</div>}
      </div>
    </div>
  );
}

export function StatStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-surface border border-rule rounded">
      {children}
    </div>
  );
}

// ── Masthead ─────────────────────────────────────────────────────────────
// Newspaper-style page header: eyebrow date + big serif greeting + optional aside.
type MastheadProps = {
  eyebrow: string;
  title: string;
  emphasis?: string;       // rendered italic in accent color
  aside?: React.ReactNode;
};
export function Masthead({ eyebrow, title, emphasis, aside }: MastheadProps) {
  return (
    <div className="flex items-end justify-between gap-8">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <div className="mt-1.5 font-serif text-[64px] leading-none tracking-[-0.04em] text-ink">
          {title}{' '}
          {emphasis && <span className="italic text-accent">{emphasis}</span>}
        </div>
      </div>
      {aside && <div className="text-right">{aside}</div>}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────────────────────
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: 'primary' | 'ghost' | 'accent';
  size?: 'md' | 'sm';
  iconLeft?: React.ReactNode;
};
export function Button({
  intent = 'primary', size = 'md', iconLeft, className, children, ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors',
        size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2.5 text-[13px]',
        intent === 'primary' && 'bg-ink text-paper hover:bg-ink/90',
        intent === 'ghost'   && 'bg-transparent text-ink border border-rule hover:bg-surface-2',
        intent === 'accent'  && 'bg-accent text-white hover:bg-accent/90',
        className,
      )}
    >
      {iconLeft}
      {children}
    </button>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────
// Documentary-style page footer.
type FooterProps = {
  left: string;
  right: string;
  className?: string;
};
export function PageFooter({ left, right, className }: FooterProps) {
  return (
    <div className={cn(
      'mt-9 pt-4 border-t border-rule flex justify-between',
      'font-mono text-[10px] tracking-[0.14em] text-ink-3',
      className,
    )}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}
