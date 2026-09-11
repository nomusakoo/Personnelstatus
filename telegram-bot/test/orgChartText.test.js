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

test('이름 옆에 "(연차, 출생년도)"가 함께 표시됨', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', birth_year: 1990, status: 'normal' },
  ];
  const text = formatOrgChartText(divisions, teams, employees, new Date('2026-01-01'));
  assert.match(text, /과장급 홍길동 \(7년차, 1990\)/);
});

test('출생년도가 없으면 연차만 표시됨 (기존과 동일)', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' },
  ];
  const text = formatOrgChartText(divisions, teams, employees, new Date('2026-01-01'));
  assert.match(text, /과장급 홍길동 \(7년차\)/);
});

test('입사일/출생년도가 모두 없으면 괄호 자체가 붙지 않음', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', status: 'normal' },
  ];
  const text = formatOrgChartText(divisions, teams, employees, new Date('2026-01-01'));
  assert.match(text, /- 과장급 홍길동$/m);
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

test('title이 주어지면 제목에 "조직도 - {title}"로 표시됨', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const text = formatOrgChartText(divisions, teams, [], new Date('2026-01-01'), '인사노무팀');
  assert.match(text, /📊 조직도 - 인사노무팀 \(2026\.01\.01 기준\)/);
});

test('title 없으면 기존처럼 "조직도"로만 표시됨', function () {
  const divisions = [{ id: 'd1', name: '본부', sort_order: 0 }];
  const teams = [{ id: 't1', div_id: 'd1', name: '팀', sort_order: 0 }];
  const text = formatOrgChartText(divisions, teams, [], new Date('2026-01-01'));
  assert.match(text, /📊 조직도 \(2026\.01\.01 기준\)/);
});
