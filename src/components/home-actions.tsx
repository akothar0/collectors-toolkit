'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';

const actionClass =
  'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors';

export function HomeActions({ authReady }: { authReady: boolean }) {
  if (!authReady) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className={`${actionClass} cursor-default border border-slate-200 bg-slate-50 text-slate-500`}>
          Clerk keys not set yet
        </div>
        <Link
          href="/scanner"
          className={`${actionClass} border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50`}
        >
          See scanner
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <SignInButton mode="modal">
        <button className={`${actionClass} bg-brand-600 text-white shadow-soft hover:bg-brand-700`}>
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className={`${actionClass} border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50`}>
          Create account
        </button>
      </SignUpButton>
      <Link
        href="/scanner"
        className={`${actionClass} border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 sm:ml-1`}
      >
        See scanner
      </Link>
    </div>
  );
}
