const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHelpText } = require('../src/keyboard');

test('buildHelpText: 유형별 섹션(이름/직급·직책/조직/임원일정/대시보드/기타)을 모두 포함', function () {
  const text = buildHelpText();
  assert.match(text, /▪ 이름 검색/);
  assert.match(text, /▪ 직급\/직책 검색/);
  assert.match(text, /▪ 조직 검색/);
  assert.match(text, /▪ 임원일정/);
  assert.match(text, /▪ 대시보드 통계/);
  assert.match(text, /▪ 기타/);
  assert.match(text, /총인원/); // 대시보드 TOPICS 제목이 포함되는지
});

test('buildHelpText: policies를 안 넘기면 "제도 조회" 섹션이 생략됨', function () {
  const text = buildHelpText();
  assert.doesNotMatch(text, /▪ 제도 조회/);
});

test('buildHelpText: policies를 넘기면 카테고리별로 묶어서 "제도 조회" 섹션에 표시', function () {
  const policies = [
    { category: '복리후생', title: '경조금' },
    { category: '복리후생', title: '경조휴가' },
    { category: '파견현황', title: '농협경제지주 소속' },
  ];
  const text = buildHelpText(policies);
  assert.match(text, /▪ 제도 조회/);
  assert.match(text, /\[복리후생\] 경조금, 경조휴가/);
  assert.match(text, /\[파견현황\] 농협경제지주 소속/);
});
