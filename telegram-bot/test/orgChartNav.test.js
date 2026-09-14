const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTopMenu,
  buildDivisionMenu,
  buildCenterMenu,
  buildDivisionResult,
  buildCenterResult,
  buildTeamResult,
  parseOrgCallback,
  handleOrgCallback,
} = require('../src/commands/orgChartNav');

const divisions = [
  { id: 'd1', name: '경영지원본부', sort_order: 0 },
  { id: 'd2', name: '국내사업본부', sort_order: 1 },
];
const teams = [
  { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0, center_name: '경영센터' },
  { id: 't2', div_id: 'd1', name: '재무회계팀', sort_order: 1, center_name: '경영센터' },
  { id: 't3', div_id: 'd1', name: '홍보팀', sort_order: 2, center_name: '' },
  { id: 't4', div_id: 'd2', name: '영업1팀', sort_order: 0 },
  { id: 't5', div_id: 'd2', name: '영업2팀', sort_order: 1 },
];
const employees = [
  { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', status: 'normal' },
  { name: '김철수', grade: '대리급', div_id: 'd1', team_id: 't2', status: 'normal' },
  { name: '박영희', grade: '사원급', div_id: 'd1', team_id: 't3', status: 'normal' },
  { name: '이영수', grade: '과장급', div_id: 'd2', team_id: 't4', status: 'normal' },
];

function _callbackData(kb) {
  return kb.inline_keyboard.flat().map(function (b) { return b.callback_data; });
}

test('buildTopMenu: "전체" 버튼 + 본부별 버튼 (sort_order 순)', function () {
  const menu = buildTopMenu(divisions);
  assert.deepEqual(_callbackData(menu.keyboard), ['org:all', 'org:d:0', 'org:d:1']);
  assert.match(menu.text, /조직도/);
});

test('buildDivisionMenu: 센터가 있으면 센터 버튼 + 센터 없는 팀은 직접 버튼으로', function () {
  const menu = buildDivisionMenu(divisions, teams, 0); // d1: 경영센터(2팀) + 홍보팀(센터 없음)
  assert.deepEqual(_callbackData(menu.keyboard), ['org:alld:0', 'org:c:0:0', 'org:t:0:x:0', 'org']);
  assert.match(menu.text, /경영지원본부/);
});

test('buildDivisionMenu: 센터가 없으면 팀들이 바로 버튼으로 나열됨', function () {
  const menu = buildDivisionMenu(divisions, teams, 1); // d2: 영업1팀, 영업2팀 (센터 없음)
  assert.deepEqual(_callbackData(menu.keyboard), ['org:alld:1', 'org:t:1:x:0', 'org:t:1:x:1', 'org']);
});

test('buildDivisionMenu: 잘못된 인덱스면 null', function () {
  assert.equal(buildDivisionMenu(divisions, teams, 99), null);
});

test('buildCenterMenu: 센터 안의 팀 버튼 + 전체/뒤로', function () {
  const menu = buildCenterMenu(divisions, teams, 0, 0); // d1의 첫 센터(경영센터)
  assert.deepEqual(_callbackData(menu.keyboard), ['org:allc:0:0', 'org:t:0:0:0', 'org:t:0:0:1', 'org:d:0']);
  assert.match(menu.text, /경영지원본부 > 경영센터/);
});

test('buildCenterMenu: 잘못된 센터 인덱스면 null', function () {
  assert.equal(buildCenterMenu(divisions, teams, 0, 5), null);
  assert.equal(buildCenterMenu(divisions, teams, 1, 0), null); // d2엔 센터가 없음
});

test('buildDivisionResult: 그 본부 소속 팀만 포함한 조직도 텍스트', function () {
  const text = buildDivisionResult(divisions, teams, employees, 0);
  assert.match(text, /경영지원본부/);
  assert.match(text, /홍길동/);
  assert.match(text, /박영희/);
  assert.doesNotMatch(text, /이영수/); // d2 소속이라 제외
});

test('buildCenterResult: 그 센터 소속 팀만 포함', function () {
  const text = buildCenterResult(divisions, teams, employees, 0, 0);
  assert.match(text, /홍길동/);
  assert.match(text, /김철수/);
  assert.doesNotMatch(text, /박영희/); // 홍보팀은 센터가 달라 제외
});

test('buildTeamResult: 센터 없는 팀도(centerToken="x") 정상적으로 찾음', function () {
  const text = buildTeamResult(divisions, teams, employees, 0, 'x', 0); // 홍보팀
  assert.match(text, /박영희/);
  assert.doesNotMatch(text, /홍길동/);
});

test('buildTeamResult: 센터 안의 팀도 정상적으로 찾음', function () {
  const text = buildTeamResult(divisions, teams, employees, 0, 0, 1); // 경영센터 > 재무회계팀
  assert.match(text, /김철수/);
  assert.doesNotMatch(text, /홍길동/);
});

test('parseOrgCallback: 여러 형태의 callback_data를 알맞게 해석', function () {
  assert.deepEqual(parseOrgCallback('org'), { action: 'topMenu' });
  assert.deepEqual(parseOrgCallback('org:all'), { action: 'allResult' });
  assert.deepEqual(parseOrgCallback('org:d:3'), { action: 'divMenu', divIndex: 3 });
  assert.deepEqual(parseOrgCallback('org:alld:3'), { action: 'divResult', divIndex: 3 });
  assert.deepEqual(parseOrgCallback('org:c:1:2'), { action: 'centerMenu', divIndex: 1, centerIndex: 2 });
  assert.deepEqual(parseOrgCallback('org:allc:1:2'), { action: 'centerResult', divIndex: 1, centerIndex: 2 });
  assert.deepEqual(parseOrgCallback('org:t:1:x:0'), { action: 'teamResult', divIndex: 1, centerToken: 'x', teamIndex: 0 });
  assert.deepEqual(parseOrgCallback('org:t:1:2:0'), { action: 'teamResult', divIndex: 1, centerToken: '2', teamIndex: 0 });
  assert.equal(parseOrgCallback('org:unknown'), null);
  assert.equal(parseOrgCallback('other'), null);
});

test('handleOrgCallback: 메뉴 이동은 kind:"menu", 결과 조회는 kind:"result"', function () {
  const snapshot = { divisions: divisions, teams: teams, employees: employees };
  const top = handleOrgCallback('org', snapshot);
  assert.equal(top.kind, 'menu');

  const all = handleOrgCallback('org:all', snapshot);
  assert.equal(all.kind, 'result');
  assert.match(all.text, /홍길동/);
  assert.match(all.text, /이영수/);

  const teamResult = handleOrgCallback('org:t:0:x:0', snapshot);
  assert.equal(teamResult.kind, 'result');
  assert.match(teamResult.text, /박영희/);
});

test('handleOrgCallback: 알 수 없는 데이터거나 조직 구조가 바뀌어 인덱스가 무효하면 null', function () {
  const snapshot = { divisions: divisions, teams: teams, employees: employees };
  assert.equal(handleOrgCallback('not-org-data', snapshot), null);
  assert.equal(handleOrgCallback('org:d:99', snapshot), null);
  assert.equal(handleOrgCallback('org:t:0:x:99', snapshot), null);
});
