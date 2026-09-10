const { GRADES } = require('../constants');
const { escapeHtml, computeTenureLabel } = require('../util');
const { BASE_STYLE } = require('./styles');

// (divisions, teams, employees) -> 스크린샷용 HTML 문서 문자열.
// 웹앱의 전체 매트릭스를 그대로 재현하진 않고, 본부→팀→직급 순으로 묶은
// 목록형으로 단순화해서 알아보기 쉽게 구성한다.
function renderOrgChartHtml(divisions, teams, employees, referenceDate) {
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

  let body;
  if (!sortedDivisions.length) {
    body = '<div class="empty">조직 데이터가 없습니다</div>';
  } else {
    body = sortedDivisions.map(function (div) {
      const divTeams = teamsByDiv[div.id] || [];
      const teamSections = divTeams.map(function (team) {
        const members = empByTeam[team.id] || [];
        const byGrade = {};
        members.forEach(function (e) {
          const g = e.grade || '기타';
          (byGrade[g] = byGrade[g] || []).push(e);
        });
        const gradeRows = GRADES.filter(function (g) { return byGrade[g] && byGrade[g].length; })
          .map(function (g) {
            const names = byGrade[g].map(function (e) {
              const tenure = computeTenureLabel(e.join_date, referenceDate);
              return escapeHtml(e.name) + (tenure ? ' <span class="tenure">· ' + tenure + '</span>' : '');
            }).join(', ');
            return '<div class="grade-row"><span class="grade-label">' + escapeHtml(g) + '</span>' +
              '<span class="names">' + names + '</span></div>';
          }).join('');
        return (
          '<div class="team-block">' +
            '<div class="team-name">' + escapeHtml(team.name) + '</div>' +
            (gradeRows || '<div class="grade-row empty-team">인원 없음</div>') +
          '</div>'
        );
      }).join('');
      return (
        '<div class="div-block">' +
          '<div class="div-name">' + escapeHtml(div.name) + '</div>' +
          '<div class="teams">' + (teamSections || '<div class="grade-row empty-team">팀 없음</div>') + '</div>' +
        '</div>'
      );
    }).join('');
  }

  const now = referenceDate || new Date();
  const stamp = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' + BASE_STYLE + `
      .div-block{background:#fff;border-radius:8px;padding:14px 18px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);}
      .div-name{font-size:15px;font-weight:700;color:#fff;background:#1e3a5f;display:inline-block;padding:4px 12px;border-radius:5px;margin-bottom:10px;}
      .teams{display:flex;flex-direction:column;gap:8px;}
      .team-block{border-left:3px solid #dce6f1;padding-left:10px;}
      .team-name{font-size:12.5px;font-weight:700;color:#2563a8;margin-bottom:4px;}
      .grade-row{display:flex;gap:8px;font-size:12px;padding:2px 0;}
      .grade-label{flex:0 0 64px;color:#666;font-weight:600;}
      .names{flex:1;color:#222;}
      .tenure{color:#999;font-size:10.5px;}
      .empty-team{color:#bbb;}
    ` + '</style></head><body>' +
      '<h1>조직도</h1><div class="sub">생성일시: ' + stamp + '</div>' +
      body +
    '</body></html>'
  );
}

module.exports = { renderOrgChartHtml: renderOrgChartHtml };
