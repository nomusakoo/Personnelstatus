const test = require('node:test');
const assert = require('node:assert/strict');
const { matchBirthYearQuery, formatBirthYearSearchText } = require('../src/commands/birthYearSearch');

const REF = new Date(2026, 8, 15); // 2026년 9월 (month는 0-based)

test('matchBirthYearQuery: "70"/"70년생"/"70년생 알려줘" 모두 1970으로 인식', function () {
  assert.deepEqual(matchBirthYearQuery('70', REF), { year: 1970 });
  assert.deepEqual(matchBirthYearQuery('70년생', REF), { year: 1970 });
  assert.deepEqual(matchBirthYearQuery('70년생 알려줘', REF), { year: 1970 });
  assert.deepEqual(matchBirthYearQuery('70 년생', REF), { year: 1970 });
});

test('matchBirthYearQuery: "00"/"01"처럼 최근 세기로 봐야 자연스러운 2자리는 2000년대로', function () {
  assert.deepEqual(matchBirthYearQuery('00년생', REF), { year: 2000 });
  assert.deepEqual(matchBirthYearQuery('01년생', REF), { year: 2001 });
  assert.deepEqual(matchBirthYearQuery('05', REF), { year: 2005 });
});

test('matchBirthYearQuery: 4자리 연도도 그대로 인식', function () {
  assert.deepEqual(matchBirthYearQuery('1970', REF), { year: 1970 });
  assert.deepEqual(matchBirthYearQuery('1970년생', REF), { year: 1970 });
});

test('matchBirthYearQuery: 미래이거나 자릿수가 애매하면 null (다른 검색으로 폴백)', function () {
  assert.equal(matchBirthYearQuery('2077', REF), null);
  assert.equal(matchBirthYearQuery('007', REF), null);
  assert.equal(matchBirthYearQuery('', REF), null);
});

test('matchBirthYearQuery: 숫자가 아닌 일반 검색어는 매칭하지 않음', function () {
  assert.equal(matchBirthYearQuery('과장급', REF), null);
  assert.equal(matchBirthYearQuery('홍길동', REF), null);
});

const divisions = [
  { id: 'd1', name: '경영지원본부', sort_order: 0 },
  { id: 'd2', name: '국내사업본부', sort_order: 1 },
];
const teams = [
  { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0 },
  { id: 't2', div_id: 'd2', name: '영업팀', sort_order: 0 },
];
const employees = [
  { name: '홍길동', grade: '과장급', birth_year: 1970, div_id: 'd1', team_id: 't1', status: 'normal' },
  { name: '김철수', grade: '대리급', birth_year: 1970, div_id: 'd2', team_id: 't2', status: 'normal' },
  { name: '박영희', grade: '사원급', birth_year: 1985, div_id: 'd1', team_id: 't1', status: 'normal' },
  { name: '퇴사자', grade: '과장급', birth_year: 1970, div_id: 'd1', team_id: 't1', status: 'leave' },
];

test('formatBirthYearSearchText: 해당 연도 재직자만 "이름(직급)"으로 소속별 표시', function () {
  const text = formatBirthYearSearchText(1970, employees, divisions, teams);
  assert.match(text, /'1970년생' 검색 결과 \(총 2명\)/);
  assert.match(text, /인사노무팀: 홍길동\(과장급\)/);
  assert.match(text, /영업팀: 김철수\(대리급\)/);
  assert.doesNotMatch(text, /박영희/);
  assert.doesNotMatch(text, /퇴사자/);
});

test('formatBirthYearSearchText: 해당하는 사람이 없으면 안내 문구', function () {
  const text = formatBirthYearSearchText(1955, employees, divisions, teams);
  assert.match(text, /찾을 수 없습니다/);
});

test('formatBirthYearSearchText: birth_year가 "87"처럼 뒤 2자리로만 저장돼 있어도 찾아냄', function () {
  const emps = [
    { name: '이짧은', grade: '과장급', birth_year: '87', div_id: 'd1', team_id: 't1', status: 'normal' },
    { name: '김긴것', grade: '대리급', birth_year: 1987, div_id: 'd1', team_id: 't1', status: 'normal' },
    { name: '박다른해', grade: '사원급', birth_year: '88', div_id: 'd1', team_id: 't1', status: 'normal' },
  ];
  const text = formatBirthYearSearchText(1987, emps, divisions, teams);
  assert.match(text, /'1987년생' 검색 결과 \(총 2명\)/);
  assert.match(text, /이짧은\(과장급\)/);
  assert.match(text, /김긴것\(대리급\)/);
  assert.doesNotMatch(text, /박다른해/);
});

test('formatBirthYearSearchText: 앞자리 0이 있는 2자리(예: "05")도 앞에 0 없이 저장돼 있으면 찾아냄', function () {
  const emps = [
    { name: '영오년생', grade: '사원급', birth_year: '5', div_id: 'd1', team_id: 't1', status: 'normal' },
  ];
  const text = formatBirthYearSearchText(2005, emps, divisions, teams);
  assert.match(text, /영오년생\(사원급\)/);
});
