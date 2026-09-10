const { DIVISION_GROUPS } = require('../constants');
const { bestFuzzyMatches, normalizeForMatch } = require('../util');

// 정확히 일치하는 게 있으면 그걸 쓰고, 없으면 부분일치로, 그마저 없으면(오타 등을
// 감안해) 가장 유사한 것만 골라 매칭시킨다. 비교는 공백/영문 대소문자를 구분하지
// 않는다("SM부문"과 "sm 부문"을 같은 것으로 취급) — normalizeForMatch 참고.
function _matchByName(items, getName, query) {
  const nq = normalizeForMatch(query);
  const exact = items.filter(function (it) { return normalizeForMatch(getName(it)) === nq; });
  if (exact.length) return exact;
  const substring = items.filter(function (it) {
    const name = normalizeForMatch(getName(it));
    return name && name.indexOf(nq) !== -1;
  });
  if (substring.length) return substring;
  return bestFuzzyMatches(items, getName, query);
}

// DIVISION_GROUPS는 항목 수가 적고("SM부문"/"SC부문") 전부 "부문"으로 끝나 짧은 접두어만
// 다르다 — 그래서 일반적인 오타 허용(유사도) 매칭을 적용하면 흔한 접미어 때문에
// 서로를 오매칭하기 쉽다(예: 오타 없이 그냥 다른 부문을 뜻하는 입력도 걸릴 수 있음).
// 이 그룹만은 정확 일치/부분일치까지만 허용하고 유사도 기반 매칭은 적용하지 않는다.
function _matchDivisionGroup(query) {
  const nq = normalizeForMatch(query);
  const exact = DIVISION_GROUPS.filter(function (g) { return normalizeForMatch(g.name) === nq; });
  if (exact.length) return exact;
  return DIVISION_GROUPS.filter(function (g) {
    const gn = normalizeForMatch(g.name);
    return gn && gn.indexOf(nq) !== -1;
  });
}

// query가 본부/부문(그룹)/팀 이름 중 하나에 해당하면 그 범위(divisions/teams/title)를 반환.
// 여러 개에 걸치면 {multiple:[...]}, 아무 것도 안 걸리면 null(=이름 검색으로 폴백).
// 우선순위: 본부(division) > 본부 그룹(DIVISION_GROUPS, 예: SM부문) > 팀 내 부문(center_name)
// > 팀(team) — 실제로는 명명 규칙이 겹치지 않는 경우가 대부분이라 순서가 결과에
// 영향을 주는 일은 드물다.
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

  const groupMatches = _matchDivisionGroup(q);
  if (groupMatches.length === 1) {
    const group = groupMatches[0];
    const divs = divisions.filter(function (d) { return group.divisionNames.indexOf(d.name) !== -1; });
    const divIds = divs.map(function (d) { return d.id; });
    return {
      title: group.name,
      divisions: divs,
      teams: teams.filter(function (t) { return divIds.indexOf(t.div_id) !== -1; }),
    };
  }
  if (groupMatches.length > 1) {
    return { multiple: groupMatches.map(function (g) { return g.name; }) };
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

module.exports = { findOrgScope: findOrgScope };
