'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';

export function HomeActions({ authReady }: { authReady: boolean }) {
  if (!authReady) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="inline-flex h-11 cursor-default items-center justify-center rounded border border-ink-600 px-6 text-sm font-medium text-ash-500">
          Clerk keys not set yet
        </div>
        <Link
          href="/scanner"
          className="inline-flex h-11 items-center justify-center text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4"
        >
          Try the scanner →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <SignUpButton mode="modal">
        <button className="inline-flex h-11 items-center justify-center rounded bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-400">
          Get started
        </button>
      </SignUpButton>
      <SignInButton mode="modal">
        <button className="inline-flex h-11 items-center justify-center rounded border border-ink-600 px-6 text-sm font-medium text-ash-300 hover:border-ink-500 hover:text-ash-50">
          Sign in
        </button>
      </SignInButton>
      <Link
        href="/scanner"
        className="inline-flex h-11 items-center justify-center text-sm font-medium text-brand-500 hover:text-brand-400 hover:underline underline-offset-4 sm:ml-1"
      >
        Try the scanner →
      </Link>
    </div>
  );
}
