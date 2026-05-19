// handoff/components/site-shell.tsx
//
// REPLACES: src/components/site-shell.tsx
//
// New navigation:
//   Top bar       Home · Collection · Portfolio · Sets · Want list
//   Top-right     Search (⌘K) · Capture ▾ menu · UserButton
//   Mobile bottom Home · Collection · [Capture FAB] · Want list · Sets
//
// Rationale: nav holds NOUNS (destinations); the Capture menu holds VERBS
// (scan, grade, add, import). Reduces top-level items 8 → 5 and elevates
// the primary action.

'use client';

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import {
  ChartColumnIncreasing, Camera, ChevronDown, Heart, Home, LibraryBig,
  Layers, ScanLine, Gauge, Plus, Import as ImportIcon, Menu, Search, X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type AppRoute = '/' | '/collection' | '/portfolio' | '/sets' | '/wantlist'
  | '/scanner' | '/grader' | '/collection/add' | '/import';

type NavItem = { href: AppRoute; label: string; icon: ReactNode; mobileTab?: boolean };

const navItems: NavItem[] = [
  { href: '/',           label: 'Home',       icon: <Home        className="h-4 w-4"/>, mobileTab: true },
  { href: '/collection', label: 'Collection', icon: <LibraryBig  className="h-4 w-4"/>, mobileTab: true },
  { href: '/portfolio',  label: 'Portfolio',  icon: <ChartColumnIncreasing className="h-4 w-4"/> },
  { href: '/sets',       label: 'Sets',       icon: <Layers      className="h-4 w-4"/>, mobileTab: true },
  { href: '/wantlist',   label: 'Want list',  icon: <Heart       className="h-4 w-4"/>, mobileTab: true },
];

type CaptureAction = { href: AppRoute; label: string; sub: string; key: string; icon: ReactNode };
const captureActions: CaptureAction[] = [
  { href: '/scanner',         label: 'Scan slab',     sub: 'PSA · BGS · SGC · cert lookup', key: 'S', icon: <ScanLine className="h-4 w-4"/> },
  { href: '/grader',          label: 'Grade raw',     sub: 'GPT-4o vision · sub-grades',    key: 'G', icon: <Gauge    className="h-4 w-4"/> },
  { href: '/collection/add',  label: 'Add manually',  sub: 'Player + grade · ~30 sec',      key: 'A', icon: <Plus     className="h-4 w-4"/> },
  { href: '/import',          label: 'Import a batch', sub: 'eBay · Fanatics · CSV · paste', key: 'I', icon: <ImportIcon className="h-4 w-4"/> },
];

function isActive(pathname: string, href: AppRoute) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Capture menu
// ─────────────────────────────────────────────────────────────────────────
function CaptureMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Global keyboard shortcuts S / G / A / I
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt?.matches?.('input, textarea, [contenteditable]')) return;
      const match = captureActions.find(a => a.key.toLowerCase() === e.key.toLowerCase());
      if (match) {
        e.preventDefault();
        router.push(match.href);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-paper hover:bg-ink/90"
      >
        <Camera className="h-3.5 w-3.5"/>
        Capture
        <ChevronDown className="h-3 w-3 opacity-70"/>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-md border border-rule bg-surface p-1.5 shadow-[0_12px_32px_rgba(20,17,13,0.12)]">
          {captureActions.slice(0, 3).map(a => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded px-3 py-2.5 hover:bg-surface-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded bg-paper text-ink">{a.icon}</div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-ink">{a.label}</div>
                <div className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-ink-3">{a.sub}</div>
              </div>
              <span className="rounded border border-rule px-1.5 py-px font-mono text-[10px] text-ink-3">{a.key}</span>
            </Link>
          ))}
          <div className="my-1.5 h-px bg-rule-soft"/>
          {captureActions.slice(3).map(a => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded px-3 py-2.5 hover:bg-surface-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded bg-paper text-ink">{a.icon}</div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-ink">{a.label}</div>
                <div className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-ink-3">{a.sub}</div>
              </div>
              <span className="rounded border border-rule px-1.5 py-px font-mono text-[10px] text-ink-3">{a.key}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Shell
// ─────────────────────────────────────────────────────────────────────────
export function SiteShell({ children, authReady }: { children: ReactNode; authReady: boolean }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [captureSheetOpen, setCaptureSheetOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); setCaptureSheetOpen(false); }, [pathname]);

  const bottomTabs = navItems.filter(i => i.mobileTab);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3.5 md:px-9">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-rule text-ink-2 lg:hidden"
          >
            <Menu className="h-4 w-4"/>
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-ink text-paper font-serif italic text-[14px]">c</span>
            <span className="font-medium text-[14px] tracking-[-0.005em] text-ink">Collectors Toolkit</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {navItems.map(it => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    'relative px-3 py-1.5 text-[13px] transition-colors',
                    active ? 'text-ink' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  {it.label}
                  {active && <span className="absolute -bottom-[15px] left-3 right-3 h-px bg-ink"/>}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-rule px-2.5 py-1.5 font-mono text-[11px] text-ink-3 md:flex">
              <Search className="h-3 w-3"/>
              <span>Search collection</span>
              <span className="ml-6">⌘K</span>
            </div>
            <CaptureMenu/>
            {authReady ? (
              <>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="hidden rounded-md border border-rule px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface md:inline-flex">Sign in</button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <UserButton appearance={{ elements: { avatarBox: 'h-7 w-7' } }}/>
                </Show>
              </>
            ) : (
              <span className="hidden font-mono text-[11px] text-ink-3 md:inline">No clerk</span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer for overflow nav (Portfolio + Import live here) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="close" className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)}/>
          <aside className="absolute inset-y-0 left-0 w-[min(100%,20rem)] bg-paper shadow-xl">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3.5">
              <p className="font-medium text-ink">Menu</p>
              <button aria-label="close" onClick={() => setDrawerOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded border border-rule">
                <X className="h-4 w-4"/>
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {[...navItems, { href: '/portfolio', label: 'Portfolio', icon: <ChartColumnIncreasing className="h-4 w-4"/> }, { href: '/import', label: 'Import', icon: <ImportIcon className="h-4 w-4"/> }].map((it: any) => {
                const active = isActive(pathname, it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px]',
                      active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2',
                    )}
                  >
                    {it.icon}
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-9 lg:pb-10">
        {children}
      </main>

      {/* Mobile bottom tab bar (5-up: 4 nouns + capture FAB center) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper px-3 pb-7 pt-2 shadow-[0_-8px_30px_rgba(20,17,13,0.06)] lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-1">
          {bottomTabs.slice(0, 2).map(t => {
            const active = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px]',
                  'font-mono tracking-[0.12em] uppercase',
                  active ? 'text-ink' : 'text-ink-3',
                )}>
                {t.icon}
                {t.label}
              </Link>
            );
          })}
          <button
            onClick={() => setCaptureSheetOpen(true)}
            aria-label="Capture"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-soft"
          >
            <Camera className="h-5 w-5"/>
          </button>
          {bottomTabs.slice(2).map(t => {
            const active = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px]',
                  'font-mono tracking-[0.12em] uppercase',
                  active ? 'text-ink' : 'text-ink-3',
                )}>
                {t.icon}
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile capture action sheet */}
      {captureSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="close" className="absolute inset-0 bg-ink/40" onClick={() => setCaptureSheetOpen(false)}/>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-paper p-4 pb-8 shadow-xl">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule"/>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Capture</p>
            <div className="space-y-1">
              {captureActions.map(a => (
                <Link key={a.href} href={a.href} onClick={() => setCaptureSheetOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-surface-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-surface-2 text-ink">{a.icon}</div>
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-ink">{a.label}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-ink-3">{a.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline cn so this file is self-contained; remove and import from @/lib/cn
// if you have one.
function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}
