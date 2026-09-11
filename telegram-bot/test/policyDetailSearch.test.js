const test = require('node:test');
const assert = require('node:assert/strict');
const { findPolicyDetailMatches, formatPolicyDetailMatches } = require('../src/commands/policyDetailSearch');

const gyeongjogeum = {
  title: '경조금',
  content:
    '<h3>결혼</h3>' +
    '<table><thead><tr><th>대상</th><th style="text-align:right">회사 (원)</th>' +
    '<th style="text-align:right">상조회 (원)</th><th>비고</th></tr></thead>' +
    '<tbody>' +
    '<tr><td>본인</td><td style="text-align:right">1,000,000</td><td style="text-align:right">500,000</td><td>회사-화환</td></tr>' +
    '<tr><td>자녀</td><td style="text-align:right">500,000</td><td style="text-align:right">400,000</td><td>회사-화환</td></tr>' +
    '</tbody></table>' +
    '<h3>사망</h3>' +
    '<table><thead><tr><th>대상</th><th style="text-align:right">회사 (원)</th></tr></thead>' +
    '<tbody><tr><td>자녀</td><td style="text-align:right">2,000,000</td></tr></tbody></table>',
};

const gyeongjohyuga = {
  title: '경조휴가',
  content:
    '<h3>결혼</h3>' +
    '<table><thead><tr><th>대상</th><th style="text-align:right">일수</th></tr></thead>' +
    '<tbody><tr><td>본인</td><td style="text-align:right">7</td></tr></tbody></table>' +
    '<h2>사망 휴가</h2>' +
    '<table><thead><tr><th>대상</th><th style="text-align:right">일수</th></tr></thead>' +
    '<tbody><tr><td>자녀</td><td style="text-align:right">5</td></tr></tbody></table>',
};

const policies = [gyeongjogeum, gyeongjohyuga];

test('findPolicyDetailMatches: 너무 짧은 쿼리(4자 미만)는 시도하지 않음', function () {
  assert.equal(findPolicyDetailMatches('본인', policies), null);
});

test('findPolicyDetailMatches: [대상+상황] 조합으로 그 표의 한 행만 찾음 (순서 무관)', function () {
  const byOrder1 = findPolicyDetailMatches('본인결혼', policies);
  const byOrder2 = findPolicyDetailMatches('결혼본인', policies);
  assert.equal(byOrder1.length, 2); // 경조금 + 경조휴가
  assert.equal(byOrder2.length, 2);
});

test('findPolicyDetailMatches: 매칭 없으면 null', function () {
  assert.equal(findPolicyDetailMatches('출산휴가휴직', policies), null);
});

test('formatPolicyDetailMatches: 제도마다 상황 제목 표현이 달라도(사망/사망 휴가) 대상 기준으로 하나로 묶음', function () {
  const hits = findPolicyDetailMatches('자녀 사망', policies);
  const result = formatPolicyDetailMatches('자녀 사망', hits);
  assert.equal(typeof result, 'object');
  // 하나의 <b>...</b> 그룹 안에 경조금/경조휴가 결과가 함께 들어있어야 함
  const groupCount = (result.html.match(/<b>/g) || []).length;
  assert.equal(groupCount, 1);
  assert.match(result.html, /\[경조금\] 회사 2,000,000원/);
  assert.match(result.html, /\[경조휴가\] 5일/);
});

test('formatPolicyDetailMatches: 비고가 있으면 값 다음 줄에 들여써서 보여줌', function () {
  const hits = findPolicyDetailMatches('본인결혼', policies);
  const result = formatPolicyDetailMatches('본인결혼', hits);
  assert.match(result.html, /\[경조금\] 회사 1,000,000원, 상조회 500,000원\n {4}\(회사-화환\)/);
  assert.match(result.html, /\[경조휴가\] 7일/);
});
