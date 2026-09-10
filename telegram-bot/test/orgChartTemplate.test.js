const test = require('node:test');
const assert = require('node:assert/strict');
const { renderOrgChartHtml } = require('../src/render/orgChartTemplate');

test('데이터 없으면 빈 상태 메시지', function () {
  const html = renderOrgChartHtml([], [], []);
  assert.match(html, /조직 데이터가 없습니다/);
});

test('본부/팀/직급별로 그룹핑되어 렌더링됨', function () {
  const divisions = [{ id: 'd1', name: '경영지원본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0 }];
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' },
    { name: '김철수', grade: '대리급', div_id: 'd1', team_id: 't1', join_date: '2015-01-01', status: 'normal' },
  ];
  const html = renderOrgChartHtml(divisions, teams, employees, new Date('2026-01-01'));
  assert.match(html, /경영지원본부/);
  assert.match(html, /인사노무팀/);
  assert.match(html, /홍길동/);
  assert.match(html, /김철수/);
  assert.match(html, /과장급/);
  assert.match(html, /대리급/);
});

test('status leave인 직원은 제외', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const employees = [{ name: '퇴사자', grade: '사원급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'leave' }];
  const html = renderOrgChartHtml(divisions, teams, employees);
  assert.doesNotMatch(html, /퇴사자/);
});

test('인원 없는 팀은 "인원 없음" 표시', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '빈팀', sort_order: 0 }];
  const html = renderOrgChartHtml(divisions, teams, []);
  assert.match(html, /빈팀/);
  assert.match(html, /인원 없음/);
});

test('이름에 HTML 특수문자가 있어도 이스케이프됨', function () {
  const divisions = [{ id: 'd1', name: '<script>본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const html = renderOrgChartHtml(divisions, teams, []);
  assert.doesNotMatch(html, /<script>본부/);
  assert.match(html, /&lt;script&gt;본부/);
});
