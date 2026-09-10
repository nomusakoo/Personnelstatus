const test = require('node:test');
const assert = require('node:assert/strict');
const { findOrgScope } = require('../src/commands/orgUnit');

// 팀의 center_name(팀을 묶는 "부문") 테스트는 DIVISION_GROUPS(constants.js, 예: "SM부문")와
// 이름이 겹치지 않는 "TG부문"을 예시로 쓴다 — 실제 DIVISION_GROUPS 매칭은 아래쪽에서 별도로 검증.
const divisions = [
  { id: 'd1', name: '경영지원본부', sort_order: 0 },
  { id: 'd2', name: '해외사업본부', sort_order: 1 },
];
const teams = [
  { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0, center_name: '' },
  { id: 't2', div_id: 'd1', name: '재무팀', sort_order: 1, center_name: 'TG부문' },
  { id: 't3', div_id: 'd1', name: '총무팀', sort_order: 2, center_name: 'TG부문' },
  { id: 't4', div_id: 'd2', name: '해외영업팀', sort_order: 0, center_name: '' },
];

test('findOrgScope: 본부명이 정확히 일치하면 그 본부의 모든 팀을 반환', function () {
  const scope = findOrgScope(divisions, teams, '경영지원본부');
  assert.equal(scope.title, '경영지원본부');
  assert.equal(scope.divisions.length, 1);
  assert.equal(scope.teams.length, 3);
});

test('findOrgScope: center_name(부문)이 일치하면 그 부문에 속한 팀만 반환', function () {
  const scope = findOrgScope(divisions, teams, 'TG부문');
  assert.equal(scope.title, 'TG부문');
  assert.equal(scope.teams.length, 2);
  assert.deepEqual(scope.teams.map(function (t) { return t.name; }).sort(), ['재무팀', '총무팀']);
  assert.equal(scope.divisions.length, 1);
  assert.equal(scope.divisions[0].id, 'd1');
});

test('findOrgScope: 팀명이 일치하면 그 팀 하나만 반환', function () {
  const scope = findOrgScope(divisions, teams, '인사노무팀');
  assert.equal(scope.title, '인사노무팀');
  assert.equal(scope.teams.length, 1);
  assert.equal(scope.teams[0].id, 't1');
  assert.equal(scope.divisions[0].id, 'd1');
});

test('findOrgScope: 여러 개에 걸치면 multiple 반환', function () {
  const ambiguousTeams = teams.concat([{ id: 't5', div_id: 'd2', name: '재무팀', sort_order: 1, center_name: '' }]);
  const scope = findOrgScope(divisions, ambiguousTeams, '재무팀');
  assert.ok(scope.multiple);
  assert.equal(scope.multiple.length, 2);
});

test('findOrgScope: 아무 것도 일치하지 않으면 null (이름 검색으로 폴백)', function () {
  const scope = findOrgScope(divisions, teams, '홍길동');
  assert.equal(scope, null);
});

test('findOrgScope: 조직명에 오타가 있어도(부분일치 실패 시) 유사도로 매칭', function () {
  // '인사노무팀' 오타: '노'→'로'
  const scope = findOrgScope(divisions, teams, '인사로무팀');
  assert.equal(scope.title, '인사노무팀');
  assert.equal(scope.teams[0].id, 't1');
});

test('findOrgScope: center_name에 공백이 섞여 있어도(예: "TG 부문") 매칭', function () {
  const teamsWithSpace = [
    { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0, center_name: '' },
    { id: 't2', div_id: 'd1', name: '재무팀', sort_order: 1, center_name: 'TG 부문' },
    { id: 't3', div_id: 'd1', name: '총무팀', sort_order: 2, center_name: 'TG 부문' },
  ];
  const scope = findOrgScope(divisions, teamsWithSpace, 'TG부문');
  assert.equal(scope.title, 'TG 부문');
  assert.equal(scope.teams.length, 2);
});

test('findOrgScope: center_name의 영문 대소문자가 달라도(예: "tg부문") 매칭', function () {
  const teamsLower = [
    { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0, center_name: '' },
    { id: 't2', div_id: 'd1', name: '재무팀', sort_order: 1, center_name: 'tg부문' },
  ];
  const scope = findOrgScope(divisions, teamsLower, 'TG부문');
  assert.equal(scope.title, 'tg부문');
  assert.equal(scope.teams.length, 1);
});

test('findOrgScope: 빈 문자열이면 null', function () {
  assert.equal(findOrgScope(divisions, teams, ''), null);
  assert.equal(findOrgScope(divisions, teams, '   '), null);
});

// DIVISION_GROUPS(constants.js)에 등록된 실제 그룹명("SM부문"/"SC부문")으로 검증 — 여러
// 본부(division)를 묶는 "부문"은 팀의 center_name과 달리 division 목록 자체를 넘나든다.
const groupDivisions = [
  { id: 'g1', name: '국내사업본부', sort_order: 0 },
  { id: 'g2', name: '자재사업본부', sort_order: 1 },
  { id: 'g3', name: '마케팅본부', sort_order: 2 },
  { id: 'g4', name: '해외사업본부', sort_order: 3 },
  { id: 'g5', name: '생산관리본부', sort_order: 4 },
  { id: 'g6', name: 'QA본부', sort_order: 5 },
  { id: 'g7', name: '경영지원본부', sort_order: 6 },
];
const groupTeams = [
  { id: 'gt1', div_id: 'g1', name: '국내영업팀', sort_order: 0, center_name: '' },
  { id: 'gt2', div_id: 'g4', name: '해외영업팀', sort_order: 0, center_name: '' },
  { id: 'gt3', div_id: 'g5', name: '생산1팀', sort_order: 0, center_name: '' },
  { id: 'gt4', div_id: 'g6', name: 'QA1팀', sort_order: 0, center_name: '' },
];

test('findOrgScope: "SM부문"은 국내사업본부/자재사업본부/마케팅본부/해외사업본부 4개 본부를 아우름', function () {
  const scope = findOrgScope(groupDivisions, groupTeams, 'SM부문');
  assert.equal(scope.title, 'SM부문');
  assert.equal(scope.divisions.length, 4);
  assert.deepEqual(
    scope.divisions.map(function (d) { return d.name; }).sort(),
    ['국내사업본부', '마케팅본부', '자재사업본부', '해외사업본부']
  );
  // 4개 본부 중 실제로 팀이 있는 본부(g1, g4)의 팀만 포함
  assert.equal(scope.teams.length, 2);
});

test('findOrgScope: "SC부문"은 생산관리본부/QA본부 2개 본부를 아우름', function () {
  const scope = findOrgScope(groupDivisions, groupTeams, 'SC부문');
  assert.equal(scope.title, 'SC부문');
  assert.deepEqual(scope.divisions.map(function (d) { return d.name; }).sort(), ['QA본부', '생산관리본부']);
  assert.equal(scope.teams.length, 2);
});

test('findOrgScope: "sm 부문"처럼 공백/대소문자가 달라도 그룹으로 매칭', function () {
  const scope = findOrgScope(groupDivisions, groupTeams, 'sm 부문');
  assert.equal(scope.title, 'SM부문');
});

test('findOrgScope: 부문 그룹과 이름이 겹치지 않는 본부는 영향받지 않음', function () {
  const scope = findOrgScope(groupDivisions, groupTeams, '경영지원본부');
  assert.equal(scope.title, '경영지원본부');
  assert.equal(scope.divisions.length, 1);
});
