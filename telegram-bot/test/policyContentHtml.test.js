const test = require('node:test');
const assert = require('node:assert/strict');
const {
  renderPolicyContentHtml,
  parseTable,
  parsePolicySections,
  extractRowParts,
  formatRowLine,
} = require('../src/render/policyContentHtml');

test('renderPolicyContentHtml: 제목은 굵게(<b>), 표는 행마다 "- 라벨: 값" 한 줄로 렌더링', function () {
  const content = (
    '<h2>결혼</h2>' +
    '<table><thead><tr><th>대상</th><th style="text-align:right;">일수</th></tr></thead>' +
    '<tbody>' +
    '<tr><td>본인</td><td style="text-align:right;">7</td></tr>' +
    '<tr><td>자녀</td><td style="text-align:right;">2</td></tr>' +
    '</tbody></table>'
  );
  const text = renderPolicyContentHtml({ title: '경조휴가', content: content });
  assert.match(text, /📋 <b>경조휴가<\/b>/);
  assert.match(text, /<b>결혼<\/b>/);
  assert.match(text, /- 본인: 7일/);
  assert.match(text, /- 자녀: 2일/);
  // 칸을 맞추는 표(<pre>)는 좁은 화면에서 줄바꿈되면 정렬이 깨지므로 더 이상 쓰지 않는다.
  assert.doesNotMatch(text, /<pre>/);
});

test('renderPolicyContentHtml: 금액(원) 열은 "라벨 값원"으로, 비고는 다음 줄에 들여써서 보여줌', function () {
  const content = (
    '<table><thead><tr><th>대상</th><th style="text-align:right">회사 (원)</th>' +
    '<th style="text-align:right">상조회 (원)</th><th>비고</th></tr></thead>' +
    '<tbody><tr><td>본인</td><td style="text-align:right">1,000,000</td>' +
    '<td style="text-align:right">500,000</td><td>회사-화환</td></tr></tbody></table>'
  );
  const text = renderPolicyContentHtml({ title: '경조금', content: content });
  assert.match(text, /- 본인: 회사 1,000,000원, 상조회 500,000원/);
  assert.match(text, /\n {4}\(회사-화환\)/);
  assert.doesNotMatch(text, /<pre>/);
});

test('parseTable: <th> 유무로 헤더/데이터 행을 구분하고 헤더로 열 역할(label/value/remark)을 분류', function () {
  const table = parseTable(
    '<tr><th>대상</th><th>회사 (원)</th><th>일수</th><th>비고</th></tr>' +
    '<tr><td>본인</td><td>1,000,000</td><td>7</td><td>비고내용</td></tr>'
  );
  assert.deepEqual(table.roles, ['label', 'value', 'value', 'remark']);
  assert.deepEqual(table.rows, [['본인', '1,000,000', '7', '비고내용']]);
});

test('extractRowParts: 라벨/값/비고를 원문(이스케이프 전) 그대로 분해', function () {
  const table = parseTable(
    '<tr><th>대상</th><th>회사 (원)</th><th>비고</th></tr>' +
    '<tr><td>본인</td><td>1,000,000</td><td>회사-화환 &amp; 조화</td></tr>'
  );
  const parts = extractRowParts(table, table.rows[0]);
  assert.equal(parts.labelText, '본인');
  assert.equal(parts.valueText, '회사 1,000,000원');
  assert.equal(parts.remark, '회사-화환 & 조화');
});

test('formatRowLine: extractRowParts 결과를 이스케이프하여 "- 라벨: 값" (+비고) 형태로 조립', function () {
  const table = parseTable(
    '<tr><th>대상</th><th>회사 (원)</th><th>비고</th></tr>' +
    '<tr><td>본인 & 배우자</td><td>1,000,000</td><td>비고</td></tr>'
  );
  const line = formatRowLine(table, table.rows[0]);
  assert.match(line, /^- 본인 &amp; 배우자: 회사 1,000,000원/);
  assert.match(line, /\n {4}\(비고\)$/);
});

test('parsePolicySections: 표 바로 앞의 가장 가까운 제목(h1~h6)을 heading으로 묶음', function () {
  const content = (
    '<h2>경조사 휴가</h2>' +
    '<h3>결혼</h3>' +
    '<table><tr><th>대상</th><th>일수</th></tr><tr><td>본인</td><td>7</td></tr></table>' +
    '<h2>사망 휴가</h2>' +
    '<table><tr><th>대상</th><th>일수</th></tr><tr><td>배우자</td><td>7</td></tr></table>'
  );
  const sections = parsePolicySections(content);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, '결혼');
  assert.equal(sections[0].table.rows[0][0], '본인');
  assert.equal(sections[1].heading, '사망 휴가');
  assert.equal(sections[1].table.rows[0][0], '배우자');
});

test('renderPolicyContentHtml: 표 없는 헤더 텍스트만 있는 경우도 처리', function () {
  const content = '<h2>안내</h2><p>표가 없는 일반 안내 문구입니다.</p>';
  const text = renderPolicyContentHtml({ title: '테스트', content: content });
  assert.match(text, /<b>안내<\/b>/);
  assert.match(text, /표가 없는 일반 안내 문구입니다/);
  assert.doesNotMatch(text, /<pre>/);
});

test('renderPolicyContentHtml: 헤더/셀 안의 &, > 는 HTML 특수문자로 이스케이프됨', function () {
  const content = (
    '<h2>인사 & 노무</h2>' +
    '<table><tbody><tr><td>7일 이상 초과 시 &gt; 규정 확인</td><td style="text-align:right;">1</td></tr></tbody></table>'
  );
  const text = renderPolicyContentHtml({ title: '테스트', content: content });
  assert.match(text, /<b>인사 &amp; 노무<\/b>/);
  assert.match(text, /7일 이상 초과 시 &gt; 규정 확인/);
});

test('renderPolicyContentHtml: 이미지 태그는 생략 문구로 대체', function () {
  const content = '<p>안내</p><img src="data:image/png;base64,AAAA"><p>끝</p>';
  const text = renderPolicyContentHtml({ title: '테스트', content: content });
  assert.doesNotMatch(text, /base64/);
  assert.match(text, /\[이미지 생략\]/);
});

test('renderPolicyContentHtml: 내용이 없으면 안내 문구', function () {
  const text = renderPolicyContentHtml({ title: '테스트', content: '' });
  assert.match(text, /내용이 없습니다/);
});
