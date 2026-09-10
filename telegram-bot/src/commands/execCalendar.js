const repository = require('../data/repository');
const { renderExecCalendarHtml } = require('../render/execCalendarTemplate');
const { htmlToPngBuffer } = require('../render/screenshot');

// month가 없으면 이번 달. 조회 -> 렌더 -> 스크린샷까지 수행하고 PNG Buffer를 반환한다.
async function getExecCalendarImage(sb, month) {
  const now = new Date();
  const year = now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;
  const events = await repository.getExecEventsForMonth(sb, year, targetMonth);
  const html = renderExecCalendarHtml(year, targetMonth, events);
  return htmlToPngBuffer(html);
}

module.exports = { getExecCalendarImage: getExecCalendarImage };
