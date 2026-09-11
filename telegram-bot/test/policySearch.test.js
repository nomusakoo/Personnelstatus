const test = require('node:test');
const assert = require('node:assert/strict');
const { matchPolicyExact, matchPolicy, formatPolicyText } = require('../src/commands/policySearch');

const policies = [
  { id: 8, category: '복리후생', title: '인병휴가 인병휴직', content: '<p>인병휴가 안내</p>', sort_order: 2 },
  { id: 6, category: '복리후생', title: '경조금', content: '<p>경조금 안내</p>', sort_order: 0 },
  { id: 7, category: '복리후생', title: '경조휴가', content: '<p>경조휴가 안내</p>', sort_order: 1 },
  { id: 10, category: '복리후생', title: '가족돌봄휴가 및 가족돌봄휴직', content: '<p>가족돌봄 안내</p>', sort_order: 4 },
  { id: 20, category: '파견현황', title: '농협경제지주 소속', content: '<p>농협경제지주 파견 목록</p>', sort_order: 0 },
  { id: 21, category: '파견현황', title: '해외법인 소속', content: '<p>해외법인 파견 목록</p>', sort_order: 1 },
];

test('matchPolicyExact: 제목이 정확히 일치하면 매칭', function () {
  const match = matchPolicyExact('경조휴가', policies);
  assert.equal(match.item.id, 7);
});

test('matchPolicyExact: "경조금"과 "경조휴가"는 서로 다른 별개 항목으로 정확히 구분됨', function () {
  assert.equal(matchPolicyExact('경조금', policies).item.id, 6);
  assert.equal(matchPolicyExact('경조휴가', policies).item.id, 7);
});

test('matchPolicyExact: 일치하지 않으면 null', function () {
  assert.equal(matchPolicyExact('연차', policies), null);
  assert.equal(matchPolicyExact('', policies), null);
});

test('matchPolicyExact: "파견현황"(카테고리명)은 검색되지 않음 (대시보드 키워드와 충돌 방지)', function () {
  assert.equal(matchPolicyExact('파견현황', policies), null);
});

test('matchPolicy: 부분일치로도 찾을 수 있음', function () {
  const match = matchPolicy('인병휴직', policies);
  assert.equal(match.item.id, 8);
});

test('matchPolicy: 파견현황 소속 항목은 항목명으로 직접 찾을 수 있음', function () {
  assert.equal(matchPolicy('농협경제지주 소속', policies).item.id, 20);
  assert.equal(matchPolicy('해외법인 소속', policies).item.id, 21);
});

test('matchPolicy: 오타가 있어도 가장 유사한 항목만 매칭', function () {
  const match = matchPolicy('경조휴가아', policies); // 오타
  assert.equal(match.item.id, 7);
});

test('formatPolicyText: HTML을 평문으로 변환해 제목과 함께 표시', function () {
  const match = matchPolicyExact('경조휴가', policies);
  const text = formatPolicyText('경조휴가', match);
  assert.match(text, /📋 경조휴가/);
  assert.match(text, /경조휴가 안내/);
  assert.doesNotMatch(text, /<p>/);
});

test('formatPolicyText: 여러 개 걸리면 안내 문구', function () {
  const text = formatPolicyText('경조', { multiple: ['경조금', '경조휴가'] });
  assert.match(text, /여러 개 있습니다/);
  assert.match(text, /경조금/);
  assert.match(text, /경조휴가/);
});
