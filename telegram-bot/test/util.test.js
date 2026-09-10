const test = require('node:test');
const assert = require('node:assert/strict');
const { chunkText, computeTenureLabel, levenshtein, similarityRatio, bestFuzzyMatches } = require('../src/util');

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

test('levenshtein: 편집거리 계산', function () {
  assert.equal(levenshtein('홍길동', '홍길동'), 0);
  assert.equal(levenshtein('홍길동', '홍길둥'), 1);
  assert.equal(levenshtein('', 'abc'), 3);
});

test('similarityRatio: 0(전혀 다름)~1(동일) 사이로 정규화', function () {
  assert.equal(similarityRatio('홍길동', '홍길동'), 1);
  assert.equal(similarityRatio('', ''), 1);
  assert.ok(similarityRatio('홍길동', '홍길둥') > 0.6); // 3글자 중 1글자만 다름
});

function _byName(it) { return it.name; }

test('bestFuzzyMatches: 오타가 있어도 가장 유사한 후보만 반환', function () {
  const items = [{ name: '인사노무팀' }, { name: '재무팀' }, { name: '총무팀' }];
  // '재무팀'/'총무팀'도 30% 임계값은 넘지만, '인사노무팀'이 훨씬 더 유사하므로 그것만 반환
  assert.deepEqual(bestFuzzyMatches(items, _byName, '인사로무팀'), [{ name: '인사노무팀' }]);
});

test('bestFuzzyMatches: 임계값(30%) 미만이면 빈 배열', function () {
  const items = [{ name: '홍길동' }, { name: '김철수' }];
  assert.deepEqual(bestFuzzyMatches(items, _byName, '박영희'), []);
});

test('bestFuzzyMatches: 유사도가 동점이면 둘 다 반환', function () {
  const items = [{ name: '홍길동' }, { name: '홍길둥' }];
  assert.deepEqual(bestFuzzyMatches(items, _byName, '홍길뒹'), [{ name: '홍길동' }, { name: '홍길둥' }]);
});
