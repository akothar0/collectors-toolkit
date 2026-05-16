import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGradingUserPrompt, parseGraderResponse } from '../src/lib/grader-prompt';

test('buildGradingUserPrompt uses singular for one image', () => {
  const prompt = buildGradingUserPrompt(1);
  assert.match(prompt, /provided card image carefully/);
  assert.doesNotMatch(prompt, /provided card images carefully/);
});

test('buildGradingUserPrompt uses plural for multiple images', () => {
  const prompt = buildGradingUserPrompt(3);
  assert.match(prompt, /provided card images carefully/);
});

test('parseGraderResponse returns parsed grades for valid JSON', () => {
  const parsed = parseGraderResponse(
    JSON.stringify({
      overallGrade: 9.2,
      centering: 9,
      corners: 9,
      edges: 8.5,
      surface: 9,
      psaPrediction: 9,
      bgsPrediction: 9,
      cgcPrediction: 9,
      confidence: 'high',
      conditionNotes: 'Sharp corners with minor edge wear.',
      submissionRecommended: true,
      submissionCompany: 'BGS',
      submissionRoiNotes: 'BGS may award 9.5 given sub-grade profile.',
    })
  );

  assert.ok(parsed);
  assert.equal(parsed.overallGrade, 9.2);
  assert.equal(parsed.psaPrediction, 9);
  assert.equal(parsed.submissionCompany, 'BGS');
  assert.equal(parsed.confidence, 'high');
});

test('parseGraderResponse returns null for invalid JSON', () => {
  assert.equal(parseGraderResponse('not json'), null);
  assert.equal(parseGraderResponse(null), null);
});

test('parseGraderResponse defaults missing fields safely', () => {
  const parsed = parseGraderResponse('{}');
  assert.ok(parsed);
  assert.equal(parsed.overallGrade, 0);
  assert.equal(parsed.confidence, 'low');
  assert.equal(parsed.conditionNotes, '');
  assert.equal(parsed.submissionRecommended, false);
});
