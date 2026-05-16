import assert from 'node:assert/strict';
import test from 'node:test';
import { isProtectedRoute, isPublicRoute, signInPathForRequest } from '../src/lib/scanner-route-policy';

test('isPublicRoute allows home and auth pages', () => {
  assert.equal(isPublicRoute('/'), true);
  assert.equal(isPublicRoute('/sign-in'), true);
  assert.equal(isPublicRoute('/sign-in/factor-one'), true);
  assert.equal(isPublicRoute('/sign-up'), true);
  assert.equal(isPublicRoute('/scanner'), false);
});

test('isProtectedRoute matches scanner and collection tools', () => {
  assert.equal(isProtectedRoute('/scanner'), true);
  assert.equal(isProtectedRoute('/scanner/history'), true);
  assert.equal(isProtectedRoute('/collection'), true);
  assert.equal(isProtectedRoute('/'), false);
});

test('signInPathForRequest preserves redirect target', () => {
  const url = signInPathForRequest('https://collectors-toolkit.vercel.app/scanner');
  assert.equal(url.pathname, '/sign-in');
  assert.equal(url.origin, 'https://collectors-toolkit.vercel.app');
});
