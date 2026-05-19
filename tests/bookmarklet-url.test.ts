import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBookmarkletAppUrl } from '../src/lib/bookmarklet-url';

test('resolveBookmarkletAppUrl uses request origin on localhost', () => {
  const url = resolveBookmarkletAppUrl(new URL('http://localhost:3001/api/bookmarklet'));
  assert.equal(url, 'http://localhost:3001');
});

test('resolveBookmarkletAppUrl uses NEXT_PUBLIC_APP_URL in production', () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
  try {
    const url = resolveBookmarkletAppUrl(new URL('https://app.example.com/api/bookmarklet'));
    assert.equal(url, 'https://app.example.com');
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prev;
  }
});
