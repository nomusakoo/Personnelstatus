const repository = require('../data/repository');
const { formatExecCalendarText } = require('../render/execCalendarText');

// year/month를 조회 -> 텍스트 포맷팅까지 수행하고 문자열을 반환한다.
// sb2(외부 연동 Supabase 클라이언트)가 주어지면 hr_exec_events도 함께 조회해 합친다.
async function getExecCalendarTextForYearMonth(sb, year, month, sb2) {
  const queries = [repository.getExecEventsForMonth(sb, year, month)];
  if (sb2) queries.push(repository.getExternalExecEventsForMonth(sb2, year, month));
  const results = await Promise.all(queries);
  const events = results[0].concat(results[1] || []);

  return formatExecCalendarText(year, month, events);
}

// month가 없으면 이번 달(현재 연도 기준). "임원일정 10월"처럼 텍스트로 달을 직접
// 입력한 경우에 쓰인다 — 버튼(이번달/다음달)으로 고른 경우는 execCalendarNav.js가
// 연도까지 정확히 계산해 getExecCalendarTextForYearMonth를 직접 호출한다.
async function getExecCalendarText(sb, month, sb2) {
  const now = new Date();
  const year = now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;
  return getExecCalendarTextForYearMonth(sb, year, targetMonth, sb2);
}

module.exports = {
  getExecCalendarText: getExecCalendarText,
  getExecCalendarTextForYearMonth: getExecCalendarTextForYearMonth,
};
