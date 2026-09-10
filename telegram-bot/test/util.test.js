const test = require('node:test');
const assert = require('node:assert/strict');
const { chunkText, computeTenureLabel } = require('../src/util');

test('chunkText: 짧은 텍스트는 청크 1개', function () {
  const chunks = chunkText('한 줄\n또 한 줄', 100);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], '한 줄\n또 한 줄');
});

test('chunkText: maxLen을 넘으면 줄 단위로 분리', function () {
  const lines = [];
  for (let i = 0; i < 50; i++) lines.push('line-' + i);
  const text = lines.join('\n');
  const chunks = chunkText(text, 100);
  assert.ok(chunks.length > 1);
  chunks.forEach(function (c) { assert.ok(c.length <= 100 || c.split('\n').length === 1); });
  // 원본 줄이 순서대로 전부 보존되는지 확인
  const rejoined = chunks.join('\n');
  assert.equal(rejoined, text);
});

test('computeTenureLabel: 입사일 기준 N년차 계산', function () {
  assert.equal(computeTenureLabel('2020-01-01', new Date('2026-01-01')), '7년차');
  assert.equal(computeTenureLabel('2020-06-01', new Date('2026-01-01')), '6년차');
  assert.equal(computeTenureLabel(null, new Date('2026-01-01')), null);
});
