const repository = require('../data/repository');
const { renderExecCalendarHtml } = require('../render/execCalendarTemplate');
const { htmlToPngBuffer } = require('../render/screenshot');

// month가 없으면 이번 달. 조회 -> 렌더 -> 스크린샷까지 수행하고 PNG Buffer를 반환한다.
// sb2(외부 연동 Supabase 클라이언트)가 주어지면 hr_exec_events도 함께 조회해 합친다.
async function getExecCalendarImage(sb, month, sb2) {
  const now = new Date();
  const year = now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const queries = [repository.getExecEventsForMonth(sb, year, targetMonth)];
  if (sb2) queries.push(repository.getExternalExecEventsForMonth(sb2, year, targetMonth));
  const results = await Promise.all(queries);
  const events = results[0].concat(results[1] || []);

  const html = renderExecCalendarHtml(year, targetMonth, events);
  return htmlToPngBuffer(html);
}

module.exports = { getExecCalendarImage: getExecCalendarImage };
