const repository = require('../data/repository');
const { formatExecCalendarText } = require('../render/execCalendarText');

// month가 없으면 이번 달. 조회 -> 텍스트 포맷팅까지 수행하고 문자열을 반환한다.
// sb2(외부 연동 Supabase 클라이언트)가 주어지면 hr_exec_events도 함께 조회해 합친다.
async function getExecCalendarText(sb, month, sb2) {
  const now = new Date();
  const year = now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const queries = [repository.getExecEventsForMonth(sb, year, targetMonth)];
  if (sb2) queries.push(repository.getExternalExecEventsForMonth(sb2, year, targetMonth));
  const results = await Promise.all(queries);
  const events = results[0].concat(results[1] || []);

  return formatExecCalendarText(year, targetMonth, events);
}

module.exports = { getExecCalendarText: getExecCalendarText };
