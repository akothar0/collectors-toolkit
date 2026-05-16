import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { SiteShell } from '@/components/site-shell';
import type { ReactNode } from 'react';
import './globals.css';

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Collectors Toolkit',
  description: 'AI-powered tools for sports card collectors.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="font-[family-name:var(--font-body)]">
        {clerkReady ? (
          <ClerkProvider>
            <SiteShell authReady>{children}</SiteShell>
          </ClerkProvider>
        ) : (
          <SiteShell authReady={false}>{children}</SiteShell>
        )}
      </body>
    </html>
  );
}
