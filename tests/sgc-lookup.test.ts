import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSGCLookupHtml } from '../src/lib/cert-lookup/sgc';

const SGC_HTML = `<html><body>
<div class="player">Shohei Ohtani</div>
<div class="description">2018 Bowman Chrome</div>
<div class="year">2018</div>
<div class="card #">BCP-1</div>
<div class="grade">SGC 10</div>
</body></html>`;

test('parseSGCLookupHtml extracts card fields from HTML', () => {
  const result = parseSGCLookupHtml('98765432', SGC_HTML);

  assert.ok(result);
  assert.equal(result?.certNumber, '98765432');
  assert.equal(result?.player, 'Shohei Ohtani');
  assert.equal(result?.year, 2018);
  assert.match(result?.setName ?? '', /Bowman Chrome/i);
  assert.equal(result?.grade, 10);
  assert.equal(result?.source, 'sgc_scrape');
});

test('parseSGCLookupHtml returns null when page has no results', () => {
  const result = parseSGCLookupHtml('999', '<html><body>no results</body></html>');
  assert.equal(result, null);
});
