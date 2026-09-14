const { InlineKeyboard } = require('grammy');

// "임원일정"을 누르면 바로 이번 달을 보내는 대신, 이번달/다음달 중 고를 수 있는
// 버튼을 먼저 보여준다. "임원일정 10월"처럼 달을 텍스트로 직접 입력하는 기존 방식은
// 그대로 두고(router.js가 그 경우 별도로 처리), 버튼으로 고르는 경우만 이 모듈이 담당한다.
function buildExecCalendarMenu() {
  const kb = new InlineKeyboard().text('이번달', 'exec:cur').row().text('다음달', 'exec:next');
  return { text: '📅 임원일정\n\n조회할 달을 선택하세요.', keyboard: kb };
}

// callback_data("exec:cur" | "exec:next")를 실제 {year, month}로 바꾼다. "다음달"이
// 12월 다음이면 연도가 넘어가야(1월, 내년) 하므로 참조 시각을 기준으로 직접 계산한다
// (단순히 이번 달의 month+1만 하면 12월 다음이 "13월"이 되는 오류가 생김).
// referenceDate는 테스트에서 특정 시점(연말 등)을 주입하기 위한 것 — 기본은 현재 시각.
function resolveExecCalendarTarget(data, referenceDate) {
  const now = referenceDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (data === 'exec:cur') return { year: year, month: month };
  if (data === 'exec:next') {
    return month === 12 ? { year: year + 1, month: 1 } : { year: year, month: month + 1 };
  }
  return null;
}

module.exports = {
  buildExecCalendarMenu: buildExecCalendarMenu,
  resolveExecCalendarTarget: resolveExecCalendarTarget,
};
