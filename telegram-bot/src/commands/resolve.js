const repository = require('../data/repository');
const { findOrgScope } = require('./orgUnit');
const { formatOrgChartText } = require('../render/orgChartText');
const { matchDashboardTopicExact, matchDashboardTopic, formatDashboardText } = require('./dashboard');
const { matchRole, formatRoleSearchText } = require('./roleSearch');
const { trimAndValidateQuery, formatSearchReply, fuzzyMatchByName } = require('./nameSearch');
const { normalizeForMatch } = require('../util');

function _indexById(items) {
  const byId = {};
  items.forEach(function (it) { byId[it.id] = it; });
  return byId;
}

// 조직도/임원일정처럼 고정 키워드가 아닌 나머지 모든 입력(이름/직급·직책/조직명/대시보드
// 키워드)을 하나의 데이터 조회로 해결한다. 우선순위:
//   1) 이름이 정확히 일치하는 직원/임원 — 있으면 최우선으로 그 사람만 보여준다.
//      ("박상민"처럼 정확한 이름을 입력했는데 조직명 오타 매칭이나 다른 사람의
//      유사 이름에 걸려 엉뚱한 결과가 먼저 나오는 걸 막기 위함.)
//   2) 직급(예: 과장급) 또는 직책(예: 팀장/본부장/사외이사) — 해당하는 사람 전체 명단
//   3) 대시보드 키워드와 "정확히" 일치 (예: 총원/총인원) — 조직명 검색보다 먼저 확인한다.
//      조직명 검색에는 오타 허용용 유사도 매칭이 있어서, 순서가 바뀌면 "총원"처럼 확실한
//      키워드조차 우연히 비슷한 본부/팀 이름으로 잘못 빠질 수 있기 때문이다(실제로 발생했던
//      문제: "총원"을 입력하면 무관한 "강원지점" 조직도가 나옴).
//   4) 조직명(본부/부문 그룹/팀 내 부문/팀) — 부분일치·유사도 매칭 포함
//   5) 대시보드 키워드의 부분일치/유사도 매칭 (3번의 정확 일치에서 못 찾은 나머지)
//   6) 그 외에는 이름 부분일치/유사도 검색으로 폴백
async function resolveTextQuery(sb, rawQuery) {
  const query = trimAndValidateQuery(rawQuery);
  if (!query) {
    return '이름을 2글자 이상 입력해 주세요.';
  }

  const [{ divisions, teams, employees }, executives] = await Promise.all([
    repository.getOrgSnapshot(sb),
    repository.getAllExecutives(sb),
  ]);
  const divById = _indexById(divisions);
  const teamById = _indexById(teams);

  const nq = normalizeForMatch(query);
  const exactEmployees = employees.filter(function (e) { return normalizeForMatch(e.name) === nq; });
  const exactExecutives = executives.filter(function (x) { return normalizeForMatch(x.name) === nq; });
  if (exactEmployees.length || exactExecutives.length) {
    return formatSearchReply(query, exactEmployees, exactExecutives, divById, teamById);
  }

  const role = matchRole(query, employees, divisions, teams, executives);
  if (role) {
    return formatRoleSearchText(role, employees, divisions, teams, executives);
  }

  const exactDashMatch = matchDashboardTopicExact(query);
  if (exactDashMatch) {
    return formatDashboardText(exactDashMatch.key, employees, divisions, executives);
  }

  const scope = findOrgScope(divisions, teams, query);
  if (scope) {
    if (scope.multiple) {
      return (
        "'" + query + "'에 해당하는 조직이 여러 개 있습니다: " + scope.multiple.join(', ') +
        '\n조직명을 더 구체적으로 입력해 주세요.'
      );
    }
    return formatOrgChartText(scope.divisions, scope.teams, employees, null, scope.title);
  }

  const dashMatch = matchDashboardTopic(query);
  if (dashMatch) {
    if (dashMatch.multiple) {
      return (
        "'" + query + "'에 해당하는 통계 항목이 여러 개 있습니다: " + dashMatch.multiple.join(', ') +
        '\n항목명을 더 구체적으로 입력해 주세요.'
      );
    }
    return formatDashboardText(dashMatch.key, employees, divisions, executives);
  }

  const matchedEmployees = fuzzyMatchByName(employees, query);
  const matchedExecutives = fuzzyMatchByName(executives, query);
  return formatSearchReply(query, matchedEmployees, matchedExecutives, divById, teamById);
}

module.exports = { resolveTextQuery: resolveTextQuery };
