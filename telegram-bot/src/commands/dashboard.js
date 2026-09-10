const { GRADES, WORKPLACES, EMP_TYPES } = require('../constants');
const { levenshtein, normalizeForMatch } = require('../util');

// 대시보드 통계 항목의 키워드 사전. 사용자가 정확한 명칭을 모르거나 일부 단어만
// 입력해도(예: "직급별", "직급현황"), 공백을 다르게 넣어도(예: "직급 별 인원") 매칭되도록
// 여러 표현을 등록해 둔다. 오타는 matchDashboardTopic의 편집거리(레벤슈타인) 비교로 흡수한다.
const TOPICS = [
  { key: 'total', title: '총인원', aliases: ['총인원', '전체인원', '총원', '현재인원', '인원현황', '전체인원수'] },
  { key: 'join', title: '이번달 입사', aliases: ['이번달입사', '이번달입사자', '입사자', '신규입사', '신규입사자', '입사현황'] },
  { key: 'leave', title: '이번달 퇴사', aliases: ['이번달퇴사', '이번달퇴사자', '퇴사자', '퇴사현황'] },
  { key: 'transfer', title: '인사이동', aliases: ['인사이동', '전보', '이동현황'] },
  { key: 'leaveAbs', title: '휴직', aliases: ['휴직', '휴직자', '휴직현황'] },
  { key: 'dispatch', title: '파견', aliases: ['파견', '파견자', '파견현황'] },
  { key: 'byGrade', title: '직급별 인원', aliases: ['직급별', '직급현황', '직급별인원'] },
  { key: 'byPosition', title: '직책별 인원', aliases: ['직책별', '직책현황', '직책별인원'] },
  { key: 'byDivision', title: '본부별 인원', aliases: ['본부별', '부서별', '본부현황', '본부별인원'] },
  { key: 'byWorkplace', title: '사업장별 인원', aliases: ['사업장별', '근무지별', '사업장현황', '사업장별인원'] },
  { key: 'byEmpType', title: '근무직유형별 인원', aliases: ['근무직유형', '근무형태', '고용형태', '근무직', '근무직유형별'] },
];

// query가 대시보드 통계 키워드 중 하나에 해당하면 그 topic key를, 여러 개에 걸치면
// {multiple:[...]}, 전혀 해당하지 않으면(=이름/조직명 검색으로 폴백) null을 반환.
// 우선순위: 정확 일치 > 부분일치(양방향, 공백무시) > 편집거리 기반 오타 허용.
function matchDashboardTopic(query) {
  const q = normalizeForMatch(query);
  if (!q) return null;

  for (const topic of TOPICS) {
    if (topic.aliases.indexOf(q) !== -1) return { key: topic.key, title: topic.title };
  }

  const substringMatches = TOPICS.filter(function (topic) {
    return topic.aliases.some(function (a) { return a.indexOf(q) !== -1 || q.indexOf(a) !== -1; });
  });
  if (substringMatches.length === 1) return { key: substringMatches[0].key, title: substringMatches[0].title };
  if (substringMatches.length > 1) return { multiple: substringMatches.map(function (t) { return t.title; }) };

  if (q.length >= 2) {
    const fuzzyMatches = TOPICS.filter(function (topic) {
      return topic.aliases.some(function (a) {
        return Math.abs(a.length - q.length) <= 2 && levenshtein(a, q) <= 1;
      });
    });
    if (fuzzyMatches.length === 1) return { key: fuzzyMatches[0].key, title: fuzzyMatches[0].title };
    if (fuzzyMatches.length > 1) return { multiple: fuzzyMatches.map(function (t) { return t.title; }) };
  }

  return null;
}

function _countByStatus(employees, status) {
  return employees.filter(function (e) { return e.status === status; }).length;
}

// 순수 포맷팅 함수 — Supabase 호출 없이 목업 데이터로 테스트 가능
function formatDashboardText(topicKey, employees, divisions, executives) {
  const active = (employees || []).filter(function (e) { return e.status !== 'leave'; });
  executives = executives || [];

  switch (topicKey) {
    case 'total': {
      // 웹앱 getTotalCount()와 동일하게 이름 기준 중복 제거 + 대표이사/전무이사(미등록 시)를 포함
      const EXEC_INCLUDE_TITLES = ['대표이사', '전무이사'];
      const seen = new Set();
      active.forEach(function (e) { seen.add(e.name); });
      executives.forEach(function (x) {
        if (EXEC_INCLUDE_TITLES.indexOf(x.title) !== -1 && x.name && !seen.has(x.name)) seen.add(x.name);
      });
      return '👥 총인원: ' + seen.size + '명';
    }
    case 'join':
      return '🆕 이번달 입사: ' + _countByStatus(employees, 'join') + '명';
    case 'leave':
      return '👋 이번달 퇴사: ' + _countByStatus(employees, 'leave') + '명';
    case 'transfer':
      return '🔄 인사이동: ' + _countByStatus(employees, 'transfer') + '명';
    case 'leaveAbs':
      return '🛌 휴직: ' + _countByStatus(employees, 'leave_abs') + '명';
    case 'dispatch':
      return '✈️ 파견: ' + _countByStatus(employees, 'dispatch') + '명';

    case 'byGrade': {
      const byGrade = {};
      active.forEach(function (e) { const g = e.grade || '기타'; byGrade[g] = (byGrade[g] || 0) + 1; });
      const labels = GRADES.filter(function (g) { return byGrade[g]; });
      const lines = labels.map(function (g) { return g + ': ' + byGrade[g] + '명'; });
      return '📊 직급별 인원 (총 ' + active.length + '명)\n\n' + (lines.length ? lines.join('\n') : '데이터가 없습니다');
    }
    case 'byPosition': {
      const posMap = {};
      active.forEach(function (e) {
        const p = (e.position || '').trim();
        if (p) posMap[p] = (posMap[p] || 0) + 1;
      });
      const entries = Object.entries(posMap).sort(function (a, b) { return b[1] - a[1]; });
      const total = entries.reduce(function (sum, kv) { return sum + kv[1]; }, 0);
      const lines = entries.map(function (kv) { return kv[0] + ': ' + kv[1] + '명'; });
      return '📊 직책별 인원 (총 ' + total + '명)\n\n' + (lines.length ? lines.join('\n') : '데이터가 없습니다');
    }
    case 'byDivision': {
      const dc = (divisions || [])
        .map(function (d) { return { name: d.name, cnt: active.filter(function (e) { return e.div_id === d.id; }).length }; })
        .filter(function (x) { return x.cnt > 0; })
        .sort(function (a, b) { return b.cnt - a.cnt; });
      const total = dc.reduce(function (sum, x) { return sum + x.cnt; }, 0);
      const lines = dc.map(function (x) { return x.name + ': ' + x.cnt + '명'; });
      return '📊 본부별 인원 (총 ' + total + '명)\n\n' + (lines.length ? lines.join('\n') : '데이터가 없습니다');
    }
    case 'byWorkplace':
      return _formatCatCount('📊 사업장별 인원', active, 'workplace', WORKPLACES);
    case 'byEmpType':
      return _formatCatCount('📊 근무직유형별 인원', active, 'emp_type', EMP_TYPES);
    default:
      return null;
  }
}

function _formatCatCount(heading, active, field, categories) {
  const labels = categories.slice();
  const counts = labels.map(function (c) {
    return active.filter(function (e) { return (e[field] || '').trim() === c; }).length;
  });
  const unset = active.filter(function (e) { return !(e[field] || '').trim(); }).length;
  if (unset > 0) { labels.push('미입력'); counts.push(unset); }
  const total = counts.reduce(function (a, b) { return a + b; }, 0);
  const lines = labels
    .map(function (l, i) { return { l: l, c: counts[i] }; })
    .filter(function (x) { return x.c > 0; })
    .map(function (x) { return x.l + ': ' + x.c + '명'; });
  return heading + ' (총 ' + total + '명)\n\n' + (lines.length ? lines.join('\n') : '데이터가 없습니다');
}

module.exports = {
  TOPICS: TOPICS,
  matchDashboardTopic: matchDashboardTopic,
  formatDashboardText: formatDashboardText,
};
