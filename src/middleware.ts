import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
const isProtectedPage = createRouteMatcher([
  '/scanner(.*)',
  '/grader(.*)',
  '/collection(.*)',
  '/portfolio(.*)',
  '/import(.*)',
]);

export default clerkReady
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedPage(req)) {
        await auth.protect();
      }
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
