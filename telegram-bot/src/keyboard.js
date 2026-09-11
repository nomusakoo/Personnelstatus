const { Keyboard } = require('grammy');
const { TOPICS } = require('./commands/dashboard');

// 자주 쓰는 메뉴를 채팅창 하단에 고정 버튼으로 노출. resized()로 버튼 크기를 줄이고,
// persistent()로 다른 메시지를 보내도 계속 떠 있게 한다.
const mainKeyboard = new Keyboard()
  .text('조직도').text('임원일정')
  .row()
  .text('도움말')
  .resized()
  .persistent();

function buildHelpText() {
  const topicTitles = TOPICS.map(function (t) { return t.title; }).join(', ');
  return (
    '📋 사용 방법\n\n' +
    '- 이름을 입력하면 직급/생년/부서/입사일을 조회합니다.\n' +
    '- 직급/직책을 입력하면 해당하는 사람 전체 명단을 보여줍니다. (예: 과장급, 팀장, 본부장, 사외이사)\n' +
    '- 본부/부문/팀 이름을 입력하면 그 조직의 구성원만 보여줍니다. (예: 경영지원본부, SM부문, 인사노무팀)\n' +
    "- '조직도' → 전체 조직도\n" +
    "- '임원일정' 또는 '임원일정 10월' → 이번 달/지정한 달 임원 일정\n" +
    '- 제도 항목명을 입력하면 상세 내용을 보여줍니다. (예: 경조휴가, 인병휴가 인병휴직, 농협경제지주 소속)\n' +
    '- 아래 대시보드 키워드를 입력하면 통계를 조회합니다 (일부 단어만 입력하거나 띄어쓰기가 달라도 인식됩니다):\n' +
    '  ' + topicTitles
  );
}

module.exports = { mainKeyboard: mainKeyboard, buildHelpText: buildHelpText };
