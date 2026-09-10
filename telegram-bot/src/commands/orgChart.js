const repository = require('../data/repository');
const { formatOrgChartText } = require('../render/orgChartText');

// 조회 -> 텍스트 포맷팅까지 수행하고 문자열을 반환한다.
// 실제 텔레그램 전송(ctx.reply)은 호출부(index.js)에서 담당한다.
async function getOrgChartText(sb) {
  const { divisions, teams, employees } = await repository.getOrgSnapshot(sb);
  return formatOrgChartText(divisions, teams, employees);
}

module.exports = { getOrgChartText: getOrgChartText };
