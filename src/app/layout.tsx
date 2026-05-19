// handoff/layout.tsx
//
// REPLACES: src/app/layout.tsx
//
// Wires up Instrument Serif + Geist + Geist Mono via next/font/google so
// the fonts ship from your own origin (no external CSS request, no FOUT).

import type { Metadata } from 'next';
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { SiteShell } from '@/components/site-shell';
import './globals.css';

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Collectors Toolkit',
  description: 'AI tools for sports card collectors — scan, grade, track.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html lang="en" className={`${instrument.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        {hasClerk ? (
          <ClerkProvider>
            <SiteShell authReady>{children}</SiteShell>
          </ClerkProvider>
        ) : (
          <SiteShell authReady={false}>{children}</SiteShell>
        )}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
