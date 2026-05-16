import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJsonResponse } from '../src/lib/http-json';

test('readJsonResponse parses JSON text', async () => {
  const response = new Response('{"ok":true}', {
    headers: { 'content-type': 'application/json' },
  });

  assert.deepEqual(await readJsonResponse<{ ok: boolean }>(response), { ok: true });
});

test('readJsonResponse rejects empty responses', async () => {
  const response = new Response('', {
    headers: { 'content-type': 'text/html' },
  });

  await assert.rejects(() => readJsonResponse(response), /Empty response/);
});

test('readJsonResponse rejects non-JSON html', async () => {
  const response = new Response('<!doctype html><html></html>', {
    headers: { 'content-type': 'text/html' },
  });

  await assert.rejects(() => readJsonResponse(response), /Non-JSON response/);
});

