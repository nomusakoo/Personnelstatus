const RESULT_CAP = 15;
const MIN_QUERY_LEN = 2;

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

// Supabase 조회 + 포맷팅까지 담당하는 오케스트레이션. 반환값은 순수 문자열이며,
// 실제 텔레그램 전송(ctx.reply)은 호출부(index.js)에서 담당한다.
async function handleNameSearch(sb, repository, rawQuery) {
  const query = trimAndValidateQuery(rawQuery);
  if (!query) {
    return '이름을 2글자 이상 입력해 주세요.';
  }

  const [employees, executives] = await Promise.all([
    repository.searchEmployeesByName(sb, query),
    repository.searchExecutivesByName(sb, query),
  ]);

  let divById = {};
  let teamById = {};
  if (employees.length > 0) {
    const lookup = await repository.getDivisionsAndTeamsById(sb);
    divById = lookup.divById;
    teamById = lookup.teamById;
  }

  return formatSearchReply(query, employees, executives, divById, teamById);
}

module.exports = {
  trimAndValidateQuery: trimAndValidateQuery,
  formatSearchReply: formatSearchReply,
  handleNameSearch: handleNameSearch,
  RESULT_CAP: RESULT_CAP,
};
