'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import type { WantListItem } from '@/lib/wantlist';

// ── Auth CTAs (landing page) ──────────────────────────────────────────────

export function HomeActions({ authReady }: { authReady: boolean }) {
  if (!authReady) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="inline-flex h-10 cursor-default items-center justify-center rounded border border-rule px-6 text-[13px] font-medium text-ink-3">
          Clerk keys not set yet
        </div>
        <Link
          href="/scanner"
          className="inline-flex h-10 items-center justify-center text-[13px] font-medium text-accent hover:underline underline-offset-4"
        >
          Try the scanner →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <SignUpButton mode="modal">
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-6 text-[13px] font-semibold text-paper hover:bg-ink/90">
          Get started
        </button>
      </SignUpButton>
      <SignInButton mode="modal">
        <button className="inline-flex h-10 items-center justify-center rounded border border-rule px-6 text-[13px] font-medium text-ink hover:bg-surface-2">
          Sign in
        </button>
      </SignInButton>
      <Link
        href="/scanner"
        className="inline-flex h-10 items-center justify-center text-[13px] font-medium text-ink-3 hover:text-ink sm:ml-1"
      >
        Try the scanner →
      </Link>
    </div>
  );
}

// ── Want-list checkboxes (dashboard) ─────────────────────────────────────

export function WantListCheckboxes({ items: initial }: { items: WantListItem[] }) {
  const [items, setItems] = useState(initial);

  async function markFound(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/wantlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfilled: true }),
      });
    } catch {
      setItems(initial);
    }
  }

  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item.id} className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => void markFound(item.id)}
            aria-label={`Mark ${item.description} as found`}
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-rule hover:border-accent"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] text-ink">{item.description}</p>
            {item.targetPrice != null && (
              <p className="font-mono text-[10px] text-ink-3">
                target ${item.targetPrice.toLocaleString('en-US')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
