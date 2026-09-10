const { GRADES } = require('../constants');
const { computeTenureLabel } = require('../util');

// (divisions, teams, employees) -> 텔레그램 채팅에 바로 보낼 평문 텍스트.
// 본부→팀→직급 순으로 묶어서 보여주며, 웹앱의 전체 매트릭스를 그대로 재현하진 않는다.
function formatOrgChartText(divisions, teams, employees, referenceDate) {
  const activeEmployees = (employees || []).filter(function (e) { return e.status !== 'leave'; });

  const teamsByDiv = {};
  (teams || []).forEach(function (t) {
    (teamsByDiv[t.div_id] = teamsByDiv[t.div_id] || []).push(t);
  });
  Object.keys(teamsByDiv).forEach(function (divId) {
    teamsByDiv[divId].sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
  });

  const empByTeam = {};
  activeEmployees.forEach(function (e) {
    (empByTeam[e.team_id] = empByTeam[e.team_id] || []).push(e);
  });

  const sortedDivisions = (divisions || []).slice().sort(function (a, b) {
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const now = referenceDate || new Date();
  const stamp = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
  const lines = ['📊 조직도 (' + stamp + ' 기준)', ''];

  if (!sortedDivisions.length) {
    lines.push('조직 데이터가 없습니다');
    return lines.join('\n');
  }

  sortedDivisions.forEach(function (div) {
    lines.push('■ ' + div.name);
    const divTeams = teamsByDiv[div.id] || [];
    if (!divTeams.length) {
      lines.push('  (팀 없음)');
    }
    divTeams.forEach(function (team) {
      lines.push('  · ' + team.name);
      const members = empByTeam[team.id] || [];
      const byGrade = {};
      members.forEach(function (e) {
        const g = e.grade || '기타';
        (byGrade[g] = byGrade[g] || []).push(e);
      });
      const gradeLines = GRADES.filter(function (g) { return byGrade[g] && byGrade[g].length; });
      if (!gradeLines.length) {
        lines.push('    (인원 없음)');
      } else {
        gradeLines.forEach(function (g) {
          byGrade[g].forEach(function (e) {
            const tenure = computeTenureLabel(e.join_date, referenceDate);
            lines.push('    - ' + g + ' ' + e.name + (tenure ? ' (' + tenure + ')' : ''));
          });
        });
      }
    });
    lines.push('');
  });

  return lines.join('\n').trim();
}

module.exports = { formatOrgChartText: formatOrgChartText };
