'use client';

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import {
  ChartColumnIncreasing,
  Gauge,
  Heart,
  Home,
  Import,
  Layers,
  LibraryBig,
  Menu,
  ScanLine,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

type AppRoute =
  | '/'
  | '/scanner'
  | '/grader'
  | '/collection'
  | '/wantlist'
  | '/portfolio'
  | '/import'
  | '/sets';

type NavItem = {
  href: AppRoute;
  label: string;
  icon: ReactNode;
  bottomTab?: boolean;
};

const navItems: NavItem[] = [
  { href: '/scanner', label: 'Scanner', icon: <ScanLine className="h-4 w-4" />, bottomTab: true },
  { href: '/grader', label: 'Grader', icon: <Gauge className="h-4 w-4" />, bottomTab: true },
  { href: '/collection', label: 'Collection', icon: <LibraryBig className="h-4 w-4" />, bottomTab: true },
  { href: '/wantlist', label: 'Want List', icon: <Heart className="h-4 w-4" />, bottomTab: true },
  { href: '/portfolio', label: 'Portfolio', icon: <ChartColumnIncreasing className="h-4 w-4" />, bottomTab: true },
  { href: '/import', label: 'Import', icon: <Import className="h-4 w-4" />, bottomTab: true },
  { href: '/sets', label: 'Sets', icon: <Layers className="h-4 w-4" /> },
];

const drawerExtras: NavItem[] = [{ href: '/', label: 'Dashboard', icon: <Home className="h-4 w-4" /> }];

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const bottomItems = navItems.filter((item) => item.bottomTab);
  const drawerItems = [...drawerExtras, ...navItems];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
                <Home className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold tracking-tight text-slate-950">Collectors Toolkit</div>
                <div className="text-xs text-slate-500">AI tools for sports card collectors</div>
              </div>
            </Link>
          </div>

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

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <p className="font-semibold text-slate-950">Menu</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {drawerItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-4">
              {authReady ? (
                <>
                  <Show when="signed-out">
                    <div className="flex flex-col gap-2">
                      <SignInButton mode="modal">
                        <button className="min-h-11 w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
                          Sign in
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="min-h-11 w-full rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                          Sign up
                        </button>
                      </SignUpButton>
                    </div>
                  </Show>
                  <Show when="signed-in">
                    <div className="flex min-h-11 items-center">
                      <UserButton />
                    </div>
                  </Show>
                </>
              ) : (
                <p className="text-sm text-slate-500">Clerk not configured</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pt-8 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-6 gap-1">
          {bottomItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
