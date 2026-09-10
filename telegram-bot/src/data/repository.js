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

async function getExecEventsForMonth(sb, year, month) {
  const mm = String(month).padStart(2, '0');
  const from = year + '-' + mm + '-01';
  const to = year + '-' + mm + '-31'; // 날짜가 문자열(YYYY-MM-DD)이라 31로 잡아도 문자열 비교상 안전한 상한
  const { data, error } = await sb
    .from('exec_events')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('time');
  if (error) throw error;
  return data || [];
}

module.exports = {
  getOrgSnapshot: getOrgSnapshot,
  getDivisionsAndTeamsById: getDivisionsAndTeamsById,
  searchEmployeesByName: searchEmployeesByName,
  searchExecutivesByName: searchExecutivesByName,
  getExecEventsForMonth: getExecEventsForMonth,
};
