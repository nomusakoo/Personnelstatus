function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

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

module.exports = { escapeHtml: escapeHtml, computeTenureLabel: computeTenureLabel };
