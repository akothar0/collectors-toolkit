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
  { href: '/import', label: 'Import', icon: <Import className="h-4 w-4" /> },
  { href: '/sets', label: 'Sets', icon: <Layers className="h-4 w-4" />, bottomTab: true },
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
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-ink-700 text-ash-400 hover:border-ink-600 hover:text-ash-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-500 text-white">
                <ScanLine className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-tight text-ash-50">Collectors Toolkit</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-4 py-2 text-sm font-medium ${
                    active
                      ? 'text-brand-500'
                      : 'text-ash-400 hover:text-ash-50'
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
                      <button className="rounded border border-ink-600 px-4 h-9 text-sm font-medium text-ash-300 hover:border-ink-500 hover:text-ash-50">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="rounded bg-brand-500 px-4 h-9 text-sm font-semibold text-white hover:bg-brand-400">
                        Get started
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </>
            ) : (
              <span className="text-sm text-ash-500">Clerk not configured</span>
            )}
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-ink-950/70"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-ink-900 border-r border-ink-700">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-4">
              <p className="font-semibold text-ash-50">Menu</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-ink-700 text-ash-400 hover:text-ash-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
              {drawerItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-11 items-center gap-3 rounded px-3 text-sm font-medium ${
                      active ? 'text-brand-500 bg-brand-900/20' : 'text-ash-300 hover:bg-ink-800 hover:text-ash-50'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-ink-700 p-4">
              {authReady ? (
                <>
                  <Show when="signed-out">
                    <div className="flex flex-col gap-2">
                      <SignInButton mode="modal">
                        <button className="h-11 w-full rounded border border-ink-600 px-4 text-sm font-medium text-ash-300 hover:border-ink-500 hover:text-ash-50">
                          Sign in
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="h-11 w-full rounded bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-400">
                          Get started
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
                <p className="text-sm text-ash-500">Clerk not configured</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pt-8 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-950/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-6 gap-1">
          {bottomItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded px-1 py-2 text-[10px] font-medium ${
                  active ? 'text-brand-500' : 'text-ash-500 hover:text-ash-300'
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
