const { InlineKeyboard } = require('grammy');
const { formatOrgChartText } = require('../render/orgChartText');

// "조직도" 버튼을 누르면 전체 조직도를 바로 텍스트로 쏟아내는 대신, 본부(실) →
// 센터/단(있는 경우) → 팀 순으로 눌러 들어가며 원하는 범위만 좁혀 볼 수 있게 하는
// 인라인 버튼 메뉴. 메뉴 이동(본부/센터 목록)은 같은 메시지를 편집(editMessageText)해
// 계속 갈아끼우고, 실제 인원 결과(전체/특정 팀 등)는 길이 제한(4096자) 때문에 새
// 메시지로 보낸다 — 그래야 결과가 길어도 메뉴 버튼이 있는 메시지가 안 깨진다.
//
// callback_data는 실제 division/team id 대신 "정렬된 배열의 인덱스"로 인코딩한다
// (예: "org:d:2") — id가 길거나(UUID 등) center_name처럼 별도 id가 없는 값도 있어,
// 매번 최신 데이터에서 다시 계산되는 인덱스를 쓰는 편이 텔레그램 callback_data
// 64바이트 제한에서 훨씬 안전하고 구현도 간단하다. 그 사이 조직 구조가 바뀌면
// (거의 없는 일이지만) 인덱스가 어긋날 수 있는데, 그 경우 아래 함수들이 null을
// 반환하고 호출부가 "메뉴가 오래됨" 안내로 처리한다.

function _sortedDivisions(divisions) {
  return (divisions || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
}

function _teamsOfDivision(teams, divId) {
  return (teams || [])
    .filter(function (t) { return t.div_id === divId; })
    .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
}

// center_name이 있는 팀들을 등장 순서(=sort_order 순서)대로 묶는다. center_name이
// 없는 팀은 여기 포함되지 않는다(별도로 division 메뉴에 팀 버튼으로 직접 나열됨).
function _centersOf(teamsInDiv) {
  const order = [];
  const byName = {};
  teamsInDiv.forEach(function (t) {
    const cn = (t.center_name || '').trim();
    if (!cn) return;
    if (!byName[cn]) { byName[cn] = []; order.push(cn); }
    byName[cn].push(t);
  });
  return order.map(function (name) { return { name: name, teams: byName[name] }; });
}

function buildTopMenu(divisions) {
  const sorted = _sortedDivisions(divisions);
  const kb = new InlineKeyboard().text('🏢 전체 조직도', 'org:all').row();
  sorted.forEach(function (d, i) { kb.text(d.name, 'org:d:' + i).row(); });
  return { text: '📊 조직도\n\n조회할 범위를 선택하세요.', keyboard: kb };
}

function buildDivisionMenu(divisions, teams, divIndex) {
  const sorted = _sortedDivisions(divisions);
  const div = sorted[divIndex];
  if (!div) return null;
  const teamsInDiv = _teamsOfDivision(teams, div.id);
  const centers = _centersOf(teamsInDiv);
  const noCenterTeams = teamsInDiv.filter(function (t) { return !(t.center_name || '').trim(); });

  const kb = new InlineKeyboard().text('📁 전체 ' + div.name, 'org:alld:' + divIndex).row();
  centers.forEach(function (c, j) { kb.text(c.name, 'org:c:' + divIndex + ':' + j).row(); });
  noCenterTeams.forEach(function (t, k) { kb.text(t.name, 'org:t:' + divIndex + ':x:' + k).row(); });
  kb.text('◀ 뒤로', 'org');

  return { text: '📊 조직도 - ' + div.name + '\n\n조회할 범위를 선택하세요.', keyboard: kb };
}

function buildCenterMenu(divisions, teams, divIndex, centerIndex) {
  const sorted = _sortedDivisions(divisions);
  const div = sorted[divIndex];
  if (!div) return null;
  const teamsInDiv = _teamsOfDivision(teams, div.id);
  const centers = _centersOf(teamsInDiv);
  const center = centers[centerIndex];
  if (!center) return null;

  const kb = new InlineKeyboard().text('🗂 전체 ' + center.name, 'org:allc:' + divIndex + ':' + centerIndex).row();
  center.teams.forEach(function (t, k) { kb.text(t.name, 'org:t:' + divIndex + ':' + centerIndex + ':' + k).row(); });
  kb.text('◀ 뒤로', 'org:d:' + divIndex);

  return { text: '📊 조직도 - ' + div.name + ' > ' + center.name + '\n\n조회할 팀을 선택하세요.', keyboard: kb };
}

function buildDivisionResult(divisions, teams, employees, divIndex) {
  const sorted = _sortedDivisions(divisions);
  const div = sorted[divIndex];
  if (!div) return null;
  const teamsInDiv = _teamsOfDivision(teams, div.id);
  return formatOrgChartText([div], teamsInDiv, employees, null, div.name);
}

function buildCenterResult(divisions, teams, employees, divIndex, centerIndex) {
  const sorted = _sortedDivisions(divisions);
  const div = sorted[divIndex];
  if (!div) return null;
  const teamsInDiv = _teamsOfDivision(teams, div.id);
  const centers = _centersOf(teamsInDiv);
  const center = centers[centerIndex];
  if (!center) return null;
  return formatOrgChartText([div], center.teams, employees, null, div.name + ' > ' + center.name);
}

function buildTeamResult(divisions, teams, employees, divIndex, centerToken, teamIndex) {
  const sorted = _sortedDivisions(divisions);
  const div = sorted[divIndex];
  if (!div) return null;
  const teamsInDiv = _teamsOfDivision(teams, div.id);

  let team;
  if (centerToken === 'x') {
    const noCenterTeams = teamsInDiv.filter(function (t) { return !(t.center_name || '').trim(); });
    team = noCenterTeams[teamIndex];
  } else {
    const centers = _centersOf(teamsInDiv);
    const center = centers[Number(centerToken)];
    team = center && center.teams[teamIndex];
  }
  if (!team) return null;
  return formatOrgChartText([div], [team], employees, null, div.name + ' > ' + team.name);
}

function parseOrgCallback(data) {
  if (data === 'org') return { action: 'topMenu' };
  if (data === 'org:all') return { action: 'allResult' };
  let m;
  if ((m = /^org:d:(\d+)$/.exec(data))) return { action: 'divMenu', divIndex: Number(m[1]) };
  if ((m = /^org:alld:(\d+)$/.exec(data))) return { action: 'divResult', divIndex: Number(m[1]) };
  if ((m = /^org:c:(\d+):(\d+)$/.exec(data))) return { action: 'centerMenu', divIndex: Number(m[1]), centerIndex: Number(m[2]) };
  if ((m = /^org:allc:(\d+):(\d+)$/.exec(data))) return { action: 'centerResult', divIndex: Number(m[1]), centerIndex: Number(m[2]) };
  if ((m = /^org:t:(\d+):(x|\d+):(\d+)$/.exec(data))) {
    return { action: 'teamResult', divIndex: Number(m[1]), centerToken: m[2], teamIndex: Number(m[3]) };
  }
  return null;
}

// callback_data 하나를 받아 { kind: 'menu', text, keyboard } (버튼 메뉴 — 기존 메시지를
// 편집), { kind: 'result', text } (인원 결과 — 새 메시지로 전송) 또는 null(인식할 수
// 없는 데이터이거나, 그 사이 조직 구조가 바뀌어 인덱스가 더 이상 유효하지 않음)을 반환한다.
function handleOrgCallback(data, snapshot) {
  const parsed = parseOrgCallback(data);
  if (!parsed) return null;
  const divisions = snapshot.divisions;
  const teams = snapshot.teams;
  const employees = snapshot.employees;

  if (parsed.action === 'topMenu') {
    return Object.assign({ kind: 'menu' }, buildTopMenu(divisions));
  }
  if (parsed.action === 'allResult') {
    return { kind: 'result', text: formatOrgChartText(divisions, teams, employees) };
  }
  if (parsed.action === 'divMenu') {
    const r = buildDivisionMenu(divisions, teams, parsed.divIndex);
    return r ? Object.assign({ kind: 'menu' }, r) : null;
  }
  if (parsed.action === 'divResult') {
    const text = buildDivisionResult(divisions, teams, employees, parsed.divIndex);
    return text ? { kind: 'result', text: text } : null;
  }
  if (parsed.action === 'centerMenu') {
    const r = buildCenterMenu(divisions, teams, parsed.divIndex, parsed.centerIndex);
    return r ? Object.assign({ kind: 'menu' }, r) : null;
  }
  if (parsed.action === 'centerResult') {
    const text = buildCenterResult(divisions, teams, employees, parsed.divIndex, parsed.centerIndex);
    return text ? { kind: 'result', text: text } : null;
  }
  if (parsed.action === 'teamResult') {
    const text = buildTeamResult(divisions, teams, employees, parsed.divIndex, parsed.centerToken, parsed.teamIndex);
    return text ? { kind: 'result', text: text } : null;
  }
  return null;
}

module.exports = {
  buildTopMenu: buildTopMenu,
  buildDivisionMenu: buildDivisionMenu,
  buildCenterMenu: buildCenterMenu,
  buildDivisionResult: buildDivisionResult,
  buildCenterResult: buildCenterResult,
  buildTeamResult: buildTeamResult,
  parseOrgCallback: parseOrgCallback,
  handleOrgCallback: handleOrgCallback,
};
