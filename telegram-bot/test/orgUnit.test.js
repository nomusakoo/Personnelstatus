const test = require('node:test');
const assert = require('node:assert/strict');
const { findOrgScope, getOrgUnitText } = require('../src/commands/orgUnit');

const divisions = [
  { id: 'd1', name: '경영지원본부', sort_order: 0 },
  { id: 'd2', name: '해외사업본부', sort_order: 1 },
];
const teams = [
  { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0, center_name: '' },
  { id: 't2', div_id: 'd1', name: '재무팀', sort_order: 1, center_name: 'SM부문' },
  { id: 't3', div_id: 'd1', name: '총무팀', sort_order: 2, center_name: 'SM부문' },
  { id: 't4', div_id: 'd2', name: '해외영업팀', sort_order: 0, center_name: '' },
];

test('findOrgScope: 본부명이 정확히 일치하면 그 본부의 모든 팀을 반환', function () {
  const scope = findOrgScope(divisions, teams, '경영지원본부');
  assert.equal(scope.title, '경영지원본부');
  assert.equal(scope.divisions.length, 1);
  assert.equal(scope.teams.length, 3);
});

test('findOrgScope: center_name(부문)이 일치하면 그 부문에 속한 팀만 반환', function () {
  const scope = findOrgScope(divisions, teams, 'SM부문');
  assert.equal(scope.title, 'SM부문');
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

test('findOrgScope: 빈 문자열이면 null', function () {
  assert.equal(findOrgScope(divisions, teams, ''), null);
  assert.equal(findOrgScope(divisions, teams, '   '), null);
});

function makeMockSb(dataByTable) {
  return {
    from: function (table) {
      const builder = {
        select: function () { return builder; },
        order: function () { return builder; },
        then: function (resolve) { return resolve({ data: dataByTable[table] || [], error: null }); },
      };
      return builder;
    },
  };
}

test('getOrgUnitText: 조직명이면 해당 범위의 조직도 텍스트를 반환', async function () {
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' },
  ];
  const sb = makeMockSb({ divisions: divisions, teams: teams, employees: employees });
  const text = await getOrgUnitText(sb, '인사노무팀');
  assert.match(text, /조직도 - 인사노무팀/);
  assert.match(text, /홍길동/);
});

test('getOrgUnitText: 조직명이 아니면 null 반환 (이름 검색 폴백 신호)', async function () {
  const sb = makeMockSb({ divisions: divisions, teams: teams, employees: [] });
  const text = await getOrgUnitText(sb, '홍길동');
  assert.equal(text, null);
});

test('getOrgUnitText: 여러 조직에 걸치면 안내 문구 반환', async function () {
  const ambiguousTeams = teams.concat([{ id: 't5', div_id: 'd2', name: '재무팀', sort_order: 1, center_name: '' }]);
  const sb = makeMockSb({ divisions: divisions, teams: ambiguousTeams, employees: [] });
  const text = await getOrgUnitText(sb, '재무팀');
  assert.match(text, /여러 개 있습니다/);
});
