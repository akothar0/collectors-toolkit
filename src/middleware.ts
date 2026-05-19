import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isProtectedRoute, isPublicRoute, signInPathForRequest } from '@/lib/scanner-route-policy';

const clerkReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

export default clerkReady
  ? clerkMiddleware(async (auth, req) => {
      const { pathname } = req.nextUrl;

      if (isPublicRoute(pathname)) {
        return;
      }

      if (isProtectedRoute(pathname)) {
        const { userId } = await auth();

        if (!userId) {
          const signInUrl = signInPathForRequest(req.url);
          const redirectTarget = `${req.nextUrl.pathname}${req.nextUrl.search}`;
          signInUrl.searchParams.set('redirect_url', redirectTarget);
          return NextResponse.redirect(signInUrl);
        }
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
