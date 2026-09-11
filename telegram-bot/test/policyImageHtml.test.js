const test = require('node:test');
const assert = require('node:assert/strict');
const { renderPolicyImageHtml } = require('../src/render/policyImageHtml');

test('renderPolicyImageHtml: <body> 안쪽 내용만 뽑아 자체 스타일과 함께 렌더링', function () {
  const content = (
    '<!DOCTYPE html><html><head><title>다른 제목</title></head><body>' +
    '<section><h2>인원현황 - 성별</h2><p class="note">※ 년도말 기준</p>' +
    '<table><thead><tr><th>구분</th><th>\'25년</th></tr></thead>' +
    '<tbody><tr><td>남</td><td>266 (68%)</td></tr><tr><td>총원</td><td>388</td></tr></tbody></table>' +
    '</section></body></html>'
  );
  const html = renderPolicyImageHtml({ title: '연도별 인력현황', content: content });
  assert.match(html, /<h1>연도별 인력현황<\/h1>/);
  assert.match(html, /인원현황 - 성별/);
  assert.match(html, /266 \(68%\)/);
  // 원본 문서 자체의 <title>(다른 제목)이 아니라 item.title이 페이지 제목으로 쓰여야 함
  assert.doesNotMatch(html, /다른 제목/);
});

test('renderPolicyImageHtml: "총원"/"계"/"합계" 행은 total-row 클래스로 강조 표시', function () {
  const content = (
    '<body><table><tbody><tr><td>남</td><td>266</td></tr>' +
    '<tr><td>총원</td><td>388</td></tr></tbody></table></body>'
  );
  const html = renderPolicyImageHtml({ title: '연도별 인력현황', content: content });
  assert.match(html, /<tr class="total-row"><td>총원<\/td>/);
  assert.doesNotMatch(html, /<tr class="total-row"><td>남<\/td>/);
});

test('renderPolicyImageHtml: <body> 태그가 없는 조각 content도 그대로 처리', function () {
  const content = '<h2>제목</h2><table><tbody><tr><td>계</td><td>10</td></tr></tbody></table>';
  const html = renderPolicyImageHtml({ title: '테스트', content: content });
  assert.match(html, /제목/);
  assert.match(html, /<tr class="total-row"><td>계<\/td>/);
});
