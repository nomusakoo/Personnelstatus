const repository = require('../data/repository');
const { formatOrgChartText } = require('../render/orgChartText');

// 정확히 일치하는 게 하나면 그걸 쓰고, 없으면 부분일치로 넓혀서 찾는다.
function _matchByName(items, getName, query) {
  const exact = items.filter(function (it) { return getName(it) === query; });
  if (exact.length) return exact;
  return items.filter(function (it) {
    const name = getName(it);
    return name && name.indexOf(query) !== -1;
  });
}

// query가 본부/부문/팀 이름 중 하나에 해당하면 그 범위(divisions/teams/title)를 반환.
// 여러 개에 걸치면 {multiple:[...]}, 아무 것도 안 걸리면 null(=이름 검색으로 폴백).
// 우선순위: 본부(division) > 부문(center_name) > 팀(team) — 실제로는 명명 규칙이
// 겹치지 않는 경우가 대부분이라 순서가 결과에 영향을 주는 일은 드물다.
function findOrgScope(divisions, teams, query) {
  const q = (query || '').trim();
  if (!q) return null;

  const divMatches = _matchByName(divisions, function (d) { return d.name; }, q);
  if (divMatches.length === 1) {
    const div = divMatches[0];
    return {
      title: div.name,
      divisions: [div],
      teams: teams.filter(function (t) { return t.div_id === div.id; }),
    };
  }
  if (divMatches.length > 1) {
    return { multiple: divMatches.map(function (d) { return d.name; }) };
  }

  const allCenterNames = [];
  teams.forEach(function (t) {
    const cn = (t.center_name || '').trim();
    if (cn && allCenterNames.indexOf(cn) === -1) allCenterNames.push(cn);
  });
  const centerMatches = _matchByName(allCenterNames.map(function (cn) { return { name: cn }; }), function (c) { return c.name; }, q);
  if (centerMatches.length === 1) {
    const centerName = centerMatches[0].name;
    const centerTeams = teams.filter(function (t) { return (t.center_name || '').trim() === centerName; });
    const divIds = [];
    centerTeams.forEach(function (t) { if (divIds.indexOf(t.div_id) === -1) divIds.push(t.div_id); });
    const divs = divisions.filter(function (d) { return divIds.indexOf(d.id) !== -1; });
    return { title: centerName, divisions: divs, teams: centerTeams };
  }
  if (centerMatches.length > 1) {
    return { multiple: centerMatches.map(function (c) { return c.name; }) };
  }

  const teamMatches = _matchByName(teams, function (t) { return t.name; }, q);
  if (teamMatches.length === 1) {
    const team = teamMatches[0];
    const div = divisions.filter(function (d) { return d.id === team.div_id; });
    return { title: team.name, divisions: div, teams: [team] };
  }
  if (teamMatches.length > 1) {
    return { multiple: teamMatches.map(function (t) { return t.name; }) };
  }

  return null;
}

// query가 조직명이면 그 범위의 조직도 텍스트를, 여러 개 걸리면 안내 문구를,
// 조직명이 아니면 null을 반환한다(null이면 호출부가 이름 검색으로 넘어가면 됨).
async function getOrgUnitText(sb, query) {
  const { divisions, teams, employees } = await repository.getOrgSnapshot(sb);
  const scope = findOrgScope(divisions, teams, query);
  if (!scope) return null;
  if (scope.multiple) {
    return (
      "'" + query + "'에 해당하는 조직이 여러 개 있습니다: " + scope.multiple.join(', ') +
      '\n조직명을 더 구체적으로 입력해 주세요.'
    );
  }
  return formatOrgChartText(scope.divisions, scope.teams, employees, null, scope.title);
}

module.exports = { findOrgScope: findOrgScope, getOrgUnitText: getOrgUnitText };
