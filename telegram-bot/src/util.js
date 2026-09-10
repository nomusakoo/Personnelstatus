// join_date(YYYY-MM-DD)로부터 "N년차" 라벨 계산. 유효하지 않으면 null.
function computeTenureLabel(joinDate, referenceDate) {
  if (!joinDate) return null;
  const joined = new Date(joinDate);
  if (isNaN(joined.getTime())) return null;
  const ref = referenceDate || new Date();
  let years = ref.getFullYear() - joined.getFullYear();
  const monthDiff = ref.getMonth() - joined.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < joined.getDate())) {
    years -= 1;
  }
  if (years < 0) return null;
  return (years + 1) + '년차';
}

// 텔레그램 메시지는 4096자 제한이 있어, 줄 단위로 나눠서 여러 메시지로 쪼갠다.
// (한 줄 자체가 maxLen을 넘는 비정상적인 경우는 그냥 그 줄만 별도 청크로 보냄)
function chunkText(text, maxLen) {
  maxLen = maxLen || 3500;
  const lines = String(text).split('\n');
  const chunks = [];
  let current = '';
  lines.forEach(function (line) {
    const candidate = current ? current + '\n' + line : line;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

module.exports = { computeTenureLabel: computeTenureLabel, chunkText: chunkText };
