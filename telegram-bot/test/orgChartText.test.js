const test = require('node:test');
const assert = require('node:assert/strict');
const { formatOrgChartText } = require('../src/render/orgChartText');

test('데이터 없으면 빈 상태 메시지', function () {
  const text = formatOrgChartText([], [], []);
  assert.match(text, /조직 데이터가 없습니다/);
});

test('본부/팀/직급별로 그룹핑되어 텍스트로 출력됨', function () {
  const divisions = [{ id: 'd1', name: '경영지원본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0 }];
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' },
    { name: '김철수', grade: '대리급', div_id: 'd1', team_id: 't1', join_date: '2015-01-01', status: 'normal' },
  ];
  const text = formatOrgChartText(divisions, teams, employees, new Date('2026-01-01'));
  assert.match(text, /경영지원본부/);
  assert.match(text, /인사노무팀/);
  assert.match(text, /과장급 홍길동/);
  assert.match(text, /대리급 김철수/);
});

test('status leave인 직원은 제외', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const employees = [{ name: '퇴사자', grade: '사원급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'leave' }];
  const text = formatOrgChartText(divisions, teams, employees);
  assert.doesNotMatch(text, /퇴사자/);
});

test('인원 없는 팀은 "(인원 없음)" 표시', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '빈팀', sort_order: 0 }];
  const text = formatOrgChartText(divisions, teams, []);
  assert.match(text, /빈팀/);
  assert.match(text, /\(인원 없음\)/);
});
