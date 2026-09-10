// 화이트리스트: .env의 ALLOWED_TELEGRAM_IDS(콤마 구분 숫자 ID)에 없는 발신자는 거부.
// 변경은 .env 수정 + 프로세스 재시작(pm2 restart)으로 반영됨 — 코드 수정 불필요.
function isAllowed(telegramUserId, allowedIds) {
  if (telegramUserId == null) return false;
  return allowedIds.indexOf(String(telegramUserId)) !== -1;
}

module.exports = { isAllowed: isAllowed };
