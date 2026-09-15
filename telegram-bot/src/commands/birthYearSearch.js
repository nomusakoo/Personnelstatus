// "70"/"70년생"/"70년생 알려줘"/"1970년생"처럼 출생연도(2자리 또는 4자리)를 입력하면
// 그 해에 태어난 재직자 명단을 소속별로 보여준다. 2자리는 어느 세기인지 애매해서
// (예: "70"은 1970, "05"는 2005로 봐야 자연스러움 — 직원이 100세 넘게 태어났을 리는
// 없으므로) "2000+YY가 현재 연도를 넘지 않으면 2000년대, 넘으면 1900년대"로 판단한다.
const QUERY_RE = /^(\d{2}|\d{4})\s*(?:년\s*생|년생)?(?:\s+.*)?$/;

function matchBirthYearQuery(query, referenceDate) {
  const q = String(query || '').trim();
  if (!q) return null;
  const m = QUERY_RE.exec(q);
  if (!m) return null;

  const digits = m[1];
  const now = referenceDate || new Date();
  const nowYear = now.getFullYear();

  let year;
  if (digits.length === 4) {
    year = Number(digits);
  } else {
    const yy = Number(digits);
    const as2000s = 2000 + yy;
    year = as2000s <= nowYear ? as2000s : 1900 + yy;
  }

  if (year > nowYear || year < 1900) return null; // 미래이거나 터무니없이 과거면 무시
  return { year: year };
}

// employees.birth_year가 "1987"처럼 4자리로 들어있을 수도, "87"처럼 뒤 2자리만
// 들어있을 수도 있어(등록한 사람에 따라 다를 수 있음) 둘 다 찾아낸다 — targetYear(예:
// 1987)와 그 뒤 2자리("87", 앞에 0이 있으면 "05"뿐 아니라 "5"도 함께) 중 하나와
// 문자열로 같으면 매칭시킨다.
function _birthYearMatches(rawBirthYear, targetYear) {
  const v = String(rawBirthYear == null ? '' : rawBirthYear).trim();
  if (!v) return false;
  if (v === String(targetYear)) return true;
  const yy = targetYear % 100;
  return v === String(yy) || v === String(yy).padStart(2, '0');
}

// year(예: 1970)에 해당하는 재직자만 본부/팀별로 "이름(직급)" 형태로 묶어서 보여준다.
// 직급/근무직유형 검색(roleSearch.js)과 달리 매칭된 사람마다 직급이 다를 수 있어
// 이름 옆에 직급을 함께 표시한다.
function formatBirthYearSearchText(year, employees, divisions, teams) {
  const active = (employees || []).filter(function (e) { return e.status !== 'leave'; });
  const matched = active.filter(function (e) { return _birthYearMatches(e.birth_year, year); });

  const label = year + '년생';
  if (!matched.length) {
    return "'" + label + "'에 해당하는 사람을 찾을 수 없습니다.";
  }

  function groupKey(divId, teamId) { return (divId || '') + '::' + (teamId || ''); }
  const groups = {};
  matched.forEach(function (e) {
    const key = groupKey(e.div_id, e.team_id);
    if (!groups[key]) groups[key] = { names: [] };
    groups[key].names.push(e.grade ? e.name + '(' + e.grade + ')' : e.name);
  });

  const lines = ["'" + label + "' 검색 결과 (총 " + matched.length + '명)', ''];
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

  return lines.join('\n').trim();
}

module.exports = { matchBirthYearQuery: matchBirthYearQuery, formatBirthYearSearchText: formatBirthYearSearchText };
