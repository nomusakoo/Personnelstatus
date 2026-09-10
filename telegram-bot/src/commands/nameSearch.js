const { bestFuzzyMatches, normalizeForMatch } = require('../util');

const RESULT_CAP = 15;
const MIN_QUERY_LEN = 2;

// 정확히 일치 > 부분일치 > (오타 등을 감안해 가장 유사한 것만) 순으로 넓혀가며 찾는다.
// DB의 ilike는 정확한 부분일치만 가능해 오타를 허용할 수 없으므로, 후보 전체를 받아
// 클라이언트에서 이 함수로 필터링한다. 비교는 공백/영문 대소문자를 구분하지 않는다.
function _fuzzyMatchByName(items, query) {
  const nq = normalizeForMatch(query);
  const exact = items.filter(function (it) { return normalizeForMatch(it.name) === nq; });
  if (exact.length) return exact;
  const substring = items.filter(function (it) {
    const name = normalizeForMatch(it.name);
    return name && name.indexOf(nq) !== -1;
  });
  if (substring.length) return substring;
  return bestFuzzyMatches(items, function (it) { return it.name; }, query);
}

function trimAndValidateQuery(text) {
  const q = (text || '').trim();
  if (q.length < MIN_QUERY_LEN) return null;
  return q;
}

function formatEmployeeLine(e, div, team) {
  const leaveTag = e.status === 'leave' ? ' (퇴사)' : '';
  return (
    '👤 ' + e.name + leaveTag + ' (직원)\n' +
    '  직급: ' + (e.grade || '-') + '\n' +
    '  생년: ' + (e.birth_year || '-') + '\n' +
    '  부서: ' + (div ? div.name : '-') + ' / ' + (team ? team.name : '-') + '\n' +
    '  입사일: ' + (e.join_date || '-')
  );
}

function formatExecutiveLine(x) {
  return (
    '🏢 ' + x.name + ' (임원)\n' +
    '  직책: ' + (x.title || '-') + '\n' +
    '  임기: ' + (x.term_start || '-') + ' ~ ' + (x.term_end || '-')
  );
}

// 순수 포맷팅 함수 — Supabase 호출 없이 목업 데이터로 테스트 가능
function formatSearchReply(query, employees, executives, divById, teamById) {
  divById = divById || {};
  teamById = teamById || {};
  const combined = employees
    .map(function (e) {
      return { text: formatEmployeeLine(e, divById[e.div_id], teamById[e.team_id]) };
    })
    .concat(
      executives.map(function (x) {
        return { text: formatExecutiveLine(x) };
      })
    );

  if (combined.length === 0) {
    return "'" + query + "'에 해당하는 사람을 찾을 수 없습니다.";
  }

  const shown = combined.slice(0, RESULT_CAP);
  let reply = shown.map(function (c) { return c.text; }).join('\n\n');
  if (combined.length > RESULT_CAP) {
    reply += '\n\n그 외 ' + (combined.length - RESULT_CAP) + '명 더 있습니다. 이름을 더 구체적으로 입력해 주세요.';
  }
  return reply;
}

module.exports = {
  trimAndValidateQuery: trimAndValidateQuery,
  formatSearchReply: formatSearchReply,
  fuzzyMatchByName: _fuzzyMatchByName,
  RESULT_CAP: RESULT_CAP,
};
