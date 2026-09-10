// 읽기 전용 쿼리만 정의한다 (insert/update/delete 없음).
// sb(Supabase 클라이언트)는 인자로 받는다 — 테스트 시 목업 클라이언트로 교체 가능.

async function getOrgSnapshot(sb) {
  const [divRes, teamRes, empRes] = await Promise.all([
    sb.from('divisions').select('*').order('sort_order'),
    sb.from('teams').select('*').order('sort_order'),
    sb.from('employees').select('*'),
  ]);
  if (divRes.error) throw divRes.error;
  if (teamRes.error) throw teamRes.error;
  if (empRes.error) throw empRes.error;
  return {
    divisions: divRes.data || [],
    teams: teamRes.data || [],
    employees: empRes.data || [],
  };
}

async function getDivisionsAndTeamsById(sb) {
  const [divRes, teamRes] = await Promise.all([
    sb.from('divisions').select('*'),
    sb.from('teams').select('*'),
  ]);
  if (divRes.error) throw divRes.error;
  if (teamRes.error) throw teamRes.error;
  const divById = {};
  (divRes.data || []).forEach(function (d) { divById[d.id] = d; });
  const teamById = {};
  (teamRes.data || []).forEach(function (t) { teamById[t.id] = t; });
  return { divById: divById, teamById: teamById };
}

async function searchEmployeesByName(sb, query) {
  const { data, error } = await sb.from('employees').select('*').ilike('name', '%' + query + '%');
  if (error) throw error;
  return data || [];
}

async function searchExecutivesByName(sb, query) {
  const { data, error } = await sb.from('executives').select('*').ilike('name', '%' + query + '%');
  if (error) throw error;
  return data || [];
}

async function _queryEventsForMonth(sb, table, year, month) {
  const mm = String(month).padStart(2, '0');
  const from = year + '-' + mm + '-01';
  // 30/31일, 2월 등 달마다 마지막 날이 달라 고정값(예: 31)을 쓰면 존재하지 않는
  // 날짜(예: "2026-09-31")로 쿼리해 Postgres가 22008 오류를 낸다. 다음 달 1일
  // 미만(<)으로 비교해 실제 마지막 날짜 계산 없이 안전하게 그 달 전체를 포함한다.
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const to = nextYear + '-' + String(nextMonth).padStart(2, '0') + '-01';
  // time 기준 정렬은 여기서 하지 않는다 — 외부 연동 테이블(hr_exec_events)에는
  // time 컬럼이 없을 수 있어 DB 쿼리가 실패할 수 있고, 어차피 최종 출력 직전
  // formatExecCalendarText()에서 시간순으로 다시 정렬하므로 여기서는 불필요하다.
  const { data, error } = await sb
    .from(table)
    .select('*')
    .gte('date', from)
    .lt('date', to)
    .order('date');
  if (error) throw error;
  return data || [];
}

async function getExecEventsForMonth(sb, year, month) {
  return _queryEventsForMonth(sb, 'exec_events', year, month);
}

// 웹앱과 동일하게, 별도 Supabase 프로젝트(sb2)의 hr_exec_events를 읽기 전용으로 연동.
// sb2가 없으면(설정 안 함) 호출하지 않는다 — index.js/execCalendar.js에서 조건부로 호출.
async function getExternalExecEventsForMonth(sb2, year, month) {
  const rows = await _queryEventsForMonth(sb2, 'hr_exec_events', year, month);
  return rows.map(function (r) { return Object.assign({}, r, { _external: true }); });
}

module.exports = {
  getOrgSnapshot: getOrgSnapshot,
  getDivisionsAndTeamsById: getDivisionsAndTeamsById,
  searchEmployeesByName: searchEmployeesByName,
  searchExecutivesByName: searchExecutivesByName,
  getExecEventsForMonth: getExecEventsForMonth,
  getExternalExecEventsForMonth: getExternalExecEventsForMonth,
};
