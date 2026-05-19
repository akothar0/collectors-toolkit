/** App URL embedded in the bookmarklet. Local dev uses request origin so port matches npm run dev. */
export function resolveBookmarkletAppUrl(reqUrl: URL): string {
  const origin = `${reqUrl.protocol}//${reqUrl.host}`;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  const isLocal =
    reqUrl.hostname === 'localhost' ||
    reqUrl.hostname === '127.0.0.1' ||
    reqUrl.hostname.endsWith('.local');

  if (isLocal) {
    return origin;
  }

  return configured || origin;
}
