const repository = require('../data/repository');
const { renderOrgChartHtml } = require('../render/orgChartTemplate');
const { htmlToPngBuffer } = require('../render/screenshot');

// 조회 -> 렌더 -> 스크린샷까지 수행하고 PNG Buffer를 반환한다.
// 실제 텔레그램 전송(ctx.replyWithPhoto)은 호출부(index.js)에서 담당한다.
async function getOrgChartImage(sb) {
  const { divisions, teams, employees } = await repository.getOrgSnapshot(sb);
  const html = renderOrgChartHtml(divisions, teams, employees);
  return htmlToPngBuffer(html);
}

module.exports = { getOrgChartImage: getOrgChartImage };
