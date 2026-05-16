import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageUpload } from '../src/components/ImageUpload';

test('ImageUpload renders a native file input overlay for reliable picker access', () => {
  const html = renderToStaticMarkup(
    React.createElement(ImageUpload, {
      onImageSelected: () => {},
      accept: 'image/*',
      maxSizeMB: 10,
    }),
  );

  assert.match(html, /type="file"/);
  assert.match(html, /capture="environment"/);
  assert.match(html, /aria-label="Upload slab photo"/);
  assert.match(html, /absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0/);
  assert.doesNotMatch(html, /class="hidden"/);
});
