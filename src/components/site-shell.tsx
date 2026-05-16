'use client';

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import {
  ChartColumnIncreasing,
  Gauge,
  Heart,
  Home,
  Import,
  LibraryBig,
  ScanLine,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type AppRoute = '/' | '/scanner' | '/grader' | '/collection' | '/wantlist' | '/portfolio' | '/import';

type NavItem = {
  href: AppRoute;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { href: '/scanner', label: 'Scanner', icon: <ScanLine className="h-4 w-4" /> },
  { href: '/grader', label: 'Grader', icon: <Gauge className="h-4 w-4" /> },
  { href: '/collection', label: 'Collection', icon: <LibraryBig className="h-4 w-4" /> },
  { href: '/wantlist', label: 'Want List', icon: <Heart className="h-4 w-4" /> },
  { href: '/portfolio', label: 'Portfolio', icon: <ChartColumnIncreasing className="h-4 w-4" /> },
  { href: '/import', label: 'Import', icon: <Import className="h-4 w-4" /> },
];

function isActive(pathname: string, href: AppRoute) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({
  children,
  authReady,
}: {
  children: ReactNode;
  authReady: boolean;
}) {
  return <SiteShellInner authReady={authReady}>{children}</SiteShellInner>;
}

export function SiteShellInner({
  children,
  authReady,
}: {
  children: ReactNode;
  authReady: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
              <Home className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold tracking-tight text-slate-950">Collectors Toolkit</div>
              <div className="text-xs text-slate-500">AI tools for sports card collectors</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {authReady ? (
              <>
                <Show when="signed-out">
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
                        Sign up
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </>
            ) : (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
                Clerk not configured
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pt-8 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-5 gap-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
