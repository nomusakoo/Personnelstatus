const test = require('node:test');
const assert = require('node:assert/strict');
const { renderPolicyContentHtml } = require('../src/render/policyContentHtml');

test('renderPolicyContentHtml: 제목은 굵게(<b>), 표는 <pre>로 렌더링', function () {
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
  assert.match(text, /<pre>[\s\S]*<\/pre>/);
  assert.match(text, /본인/);
  assert.match(text, /자녀/);
});

test('renderPolicyContentHtml: 오른쪽 정렬(text-align:right) 열은 오른쪽으로 맞춰짐', function () {
  const content = (
    '<table><tbody>' +
    '<tr><td>본인</td><td style="text-align:right;">7</td></tr>' +
    '<tr><td>배우자의 형제자매</td><td style="text-align:right;">2</td></tr>' +
    '</tbody></table>'
  );
  const text = renderPolicyContentHtml({ title: '경조휴가', content: content });
  const pre = text.match(/<pre>([\s\S]*?)<\/pre>/)[1];
  const lines = pre.split('\n');
  assert.equal(lines[0], '본인               7');
  assert.equal(lines[1], '배우자의 형제자매  2');
  // 숫자가 각 줄의 맨 끝에 오는지(오른쪽 정렬 확인) — 한글은 고정폭 글꼴에서 2칸을
  // 차지하므로 코드 유닛 길이가 아니라 "시각적 폭"이 맞아야 실제로 줄이 맞는다.
  function visualWidth(s) {
    let w = 0;
    for (const ch of s) w += /[가-힣]/.test(ch) ? 2 : 1;
    return w;
  }
  const widths = lines.map(visualWidth);
  assert.equal(new Set(widths).size, 1);
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
