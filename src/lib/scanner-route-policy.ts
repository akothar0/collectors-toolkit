export const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up'] as const;

export const PROTECTED_ROUTE_PREFIXES = [
  '/scanner',
  '/grader',
  '/collection',
  '/wantlist',
  '/portfolio',
  '/import',
  '/sets',
] as const;

export function isPublicRoute(pathname: string) {
  if (pathname === '/') {
    return true;
  }

  return PUBLIC_ROUTES.some((route) => route !== '/' && (pathname === route || pathname.startsWith(`${route}/`)));
}

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function signInPathForRequest(requestUrl: string) {
  return new URL('/sign-in', requestUrl);
}
