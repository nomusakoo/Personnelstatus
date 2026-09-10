const { GRADES } = require('../constants');
const { normalizeForMatch } = require('../util');

// query가 직급(GRADES) 또는 직책(직원의 position, 본부장/센터장처럼 미등록 리더의
// head_title, 임원의 title)과 정확히 일치하면 그 종류와 정규화된 라벨을 반환한다.
// 오타 허용(유사도) 매칭은 적용하지 않는다 — "과장급"/"대리급"처럼 접미어가 같은
// 직급/직책끼리는 유사도가 높아 서로 오매칭되기 쉽기 때문이다(DIVISION_GROUPS와 같은 이유).
function matchRole(query, employees, divisions, teams, executives) {
  const nq = normalizeForMatch(query);
  if (!nq) return null;

  const gradeMatch = GRADES.filter(function (g) { return normalizeForMatch(g) === nq; });
  if (gradeMatch.length) return { type: 'grade', label: gradeMatch[0] };

  const labels = new Set();
  (employees || []).forEach(function (e) {
    const p = (e.position || '').trim();
    if (p) labels.add(p);
  });
  (divisions || []).forEach(function (d) {
    if (d.head_title) labels.add(d.head_title.trim());
    if (d.head2_title) labels.add(d.head2_title.trim());
  });
  (teams || []).forEach(function (t) {
    if (t.center_head_title) labels.add(t.center_head_title.trim());
  });
  (executives || []).forEach(function (x) {
    if (x.title) labels.add(x.title.trim());
  });
  const positionMatch = Array.from(labels).filter(function (l) { return normalizeForMatch(l) === nq; });
  if (positionMatch.length) return { type: 'position', label: positionMatch[0] };

  return null;
}

// role({type,label})에 해당하는 사람 전체를 본부→팀별로 묶어 텍스트로 만든다.
// - type==='grade': employees.grade가 일치하는 재직자만 (직급은 임원에게는 없는 개념)
// - type==='position': employees.position이 일치하는 재직자 + (직원으로 등록되지 않은)
//   본부장/센터장 같은 리더 + executives.title이 일치하는 임원(사외이사 등, 본부/팀 소속 없음)
function formatRoleSearchText(role, employees, divisions, teams, executives) {
  const label = role.label;
  const active = (employees || []).filter(function (e) { return e.status !== 'leave'; });

  let matched;
  const virtualEntries = [];
  let matchedExecutives = [];

  if (role.type === 'grade') {
    matched = active.filter(function (e) { return e.grade === label; });
  } else {
    matched = active.filter(function (e) { return (e.position || '').trim() === label; });
    const matchedNames = new Set(matched.map(function (e) { return e.name; }));

    function addVirtual(name, divId, teamId) {
      if (name && !matchedNames.has(name)) {
        virtualEntries.push({ name: name, divId: divId, teamId: teamId });
        matchedNames.add(name);
      }
    }
    (divisions || []).forEach(function (d) {
      if (d.head_title && d.head_title.trim() === label) addVirtual(d.head_name, d.id, null);
      if (d.head2_title && d.head2_title.trim() === label) addVirtual(d.head2_name, d.id, null);
    });
    (teams || []).forEach(function (t) {
      if (t.center_head_title && t.center_head_title.trim() === label) addVirtual(t.center_head_name, t.div_id, t.id);
    });
    matchedExecutives = (executives || []).filter(function (x) { return (x.title || '').trim() === label; });
  }

  const totalCount = matched.length + virtualEntries.length + matchedExecutives.length;
  if (totalCount === 0) {
    return "'" + label + "'에 해당하는 사람을 찾을 수 없습니다.";
  }

  const divById = {};
  (divisions || []).forEach(function (d) { divById[d.id] = d; });
  const teamById = {};
  (teams || []).forEach(function (t) { teamById[t.id] = t; });

  function groupKey(divId, teamId) { return (divId || '') + '::' + (teamId || ''); }
  const groups = {};
  function addPerson(name, divId, teamId) {
    const key = groupKey(divId, teamId);
    if (!groups[key]) groups[key] = { names: [] };
    groups[key].names.push(name);
  }
  matched.forEach(function (e) { addPerson(e.name, e.div_id, e.team_id); });
  virtualEntries.forEach(function (v) { addPerson(v.name, v.divId, v.teamId); });

  const lines = ["'" + label + "' 검색 결과 (총 " + totalCount + '명)', ''];
  const sortedDivisions = (divisions || []).slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });

  sortedDivisions.forEach(function (d) {
    const directGroup = groups[groupKey(d.id, null)];
    const divTeams = (teams || [])
      .filter(function (t) { return t.div_id === d.id; })
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    const teamLines = [];
    divTeams.forEach(function (t) {
      const g = groups[groupKey(d.id, t.id)];
      if (g) teamLines.push('  · ' + t.name + ': ' + g.names.join(', '));
    });
    if (!directGroup && !teamLines.length) return;
    lines.push('■ ' + d.name);
    if (directGroup) lines.push('  ' + directGroup.names.join(', '));
    teamLines.forEach(function (l) { lines.push(l); });
    lines.push('');
  });

  if (matchedExecutives.length) {
    lines.push('🏢 임원');
    matchedExecutives.forEach(function (x) { lines.push('  ' + x.name); });
    lines.push('');
  }

  return lines.join('\n').trim();
}

module.exports = { matchRole: matchRole, formatRoleSearchText: formatRoleSearchText };
