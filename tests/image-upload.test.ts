import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageUpload } from '../src/components/ImageUpload';

test('ImageUpload renders a native label-driven file input for reliable picker access', () => {
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
  assert.match(html, /<label /);
  assert.match(html, /class="sr-only"/);
  assert.doesNotMatch(html, /class="hidden"/);
});
