import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { SiteShell } from '@/components/site-shell';
import type { ReactNode } from 'react';
import './globals.css';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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
    <html lang="en" className={displayFont.variable}>
      <body className="font-sans">
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
