const test = require('node:test');
const assert = require('node:assert/strict');
const { matchRole, formatRoleSearchText } = require('../src/commands/roleSearch');

const divisions = [
  { id: 'd1', name: '경영지원본부', sort_order: 0, head_name: '이본부장', head_title: '본부장' },
  { id: 'd2', name: '해외사업본부', sort_order: 1 },
];
const teams = [
  { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0 },
  { id: 't2', div_id: 'd1', name: '재무팀', sort_order: 1 },
];
const employees = [
  { name: '홍길동', grade: '과장급', position: '팀장', div_id: 'd1', team_id: 't1', status: 'normal' },
  { name: '김철수', grade: '과장급', position: '', div_id: 'd1', team_id: 't2', status: 'normal' },
  { name: '박영희', grade: '대리급', position: '팀장', div_id: 'd2', team_id: null, status: 'normal' },
  { name: '퇴사자', grade: '과장급', position: '팀장', div_id: 'd1', team_id: 't1', status: 'leave' },
  { name: '인턴이', grade: '기타', emp_type: '인턴', div_id: 'd1', team_id: 't1', status: 'normal' },
  { name: '인턴퇴사자', grade: '기타', emp_type: '인턴', div_id: 'd1', team_id: 't1', status: 'leave' },
];
const executives = [{ name: '박사외', title: '사외이사' }];

test('matchRole: 직급(GRADES)에 정확히 일치하면 grade 타입 반환', function () {
  const role = matchRole('과장급', employees, divisions, teams, executives);
  assert.deepEqual(role, { type: 'grade', label: '과장급' });
});

test('matchRole: 직원 position에 일치하면 position 타입 반환', function () {
  const role = matchRole('팀장', employees, divisions, teams, executives);
  assert.deepEqual(role, { type: 'position', label: '팀장' });
});

test('matchRole: 미등록 본부장(head_title)도 직책으로 매칭', function () {
  const role = matchRole('본부장', employees, divisions, teams, executives);
  assert.deepEqual(role, { type: 'position', label: '본부장' });
});

test('matchRole: 임원 title(사외이사)도 직책으로 매칭', function () {
  const role = matchRole('사외이사', employees, divisions, teams, executives);
  assert.deepEqual(role, { type: 'position', label: '사외이사' });
});

test('matchRole: 근무직유형(EMP_TYPES)에 정확히 일치하면 empType 타입 반환', function () {
  const role = matchRole('인턴', employees, divisions, teams, executives);
  assert.deepEqual(role, { type: 'empType', label: '인턴' });
});

test('matchRole: 공백/대소문자가 달라도 매칭', function () {
  assert.deepEqual(matchRole('과장 급', employees, divisions, teams, executives), { type: 'grade', label: '과장급' });
});

test('matchRole: 해당하지 않으면 null (이름/조직명 검색으로 폴백)', function () {
  assert.equal(matchRole('홍길동', employees, divisions, teams, executives), null);
  assert.equal(matchRole('', employees, divisions, teams, executives), null);
});

test('formatRoleSearchText: 직급 검색은 재직자만, 본부/팀별로 묶어서 표시', function () {
  const text = formatRoleSearchText({ type: 'grade', label: '과장급' }, employees, divisions, teams, executives);
  assert.match(text, /'과장급' 검색 결과 \(총 2명\)/);
  assert.match(text, /경영지원본부/);
  assert.match(text, /인사노무팀: 홍길동/);
  assert.match(text, /재무팀: 김철수/);
  assert.doesNotMatch(text, /퇴사자/);
});

test('formatRoleSearchText: 근무직유형(인턴) 검색은 재직자만 표시', function () {
  const text = formatRoleSearchText({ type: 'empType', label: '인턴' }, employees, divisions, teams, executives);
  assert.match(text, /'인턴' 검색 결과 \(총 1명\)/);
  assert.match(text, /인사노무팀: 인턴이/);
  assert.doesNotMatch(text, /인턴퇴사자/);
});

test('formatRoleSearchText: 직책 검색은 미등록 리더도 포함(중복 없이)', function () {
  const text = formatRoleSearchText({ type: 'position', label: '팀장' }, employees, divisions, teams, executives);
  assert.match(text, /'팀장' 검색 결과 \(총 2명\)/);
  assert.match(text, /인사노무팀: 홍길동/);
  // 박영희는 team_id가 없어 본부 직속으로 표시됨
  assert.match(text, /해외사업본부\n {2}박영희/);
});

test('formatRoleSearchText: 미등록 본부장은 실제 직원으로 등록돼 있으면 중복 집계하지 않음', function () {
  const divisionsWithRegisteredHead = [
    { id: 'd1', name: '경영지원본부', sort_order: 0, head_name: '홍길동', head_title: '본부장' },
  ];
  const emps = [
    { name: '홍길동', grade: '과장급', position: '본부장', div_id: 'd1', team_id: 't1', status: 'normal' },
  ];
  const text = formatRoleSearchText({ type: 'position', label: '본부장' }, emps, divisionsWithRegisteredHead, teams, []);
  assert.match(text, /총 1명/);
});

test('formatRoleSearchText: 임원 title 검색은 "🏢 임원" 섹션으로 별도 표시', function () {
  const text = formatRoleSearchText({ type: 'position', label: '사외이사' }, employees, divisions, teams, executives);
  assert.match(text, /'사외이사' 검색 결과 \(총 1명\)/);
  assert.match(text, /🏢 임원/);
  assert.match(text, /박사외/);
});

test('formatRoleSearchText: 아무도 없으면 안내 문구', function () {
  const text = formatRoleSearchText({ type: 'grade', label: '기타' }, [], [], [], []);
  assert.match(text, /찾을 수 없습니다/);
});
