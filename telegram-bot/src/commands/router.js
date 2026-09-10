// 들어온 텍스트를 세 가지 명령 중 하나로 분류한다.
// 고정 키워드(조직도/임원일정)를 먼저 검사하고, 나머지는 전부 이름 검색으로 취급한다.
function classify(text) {
  const t = (text || '').trim();
  if (!t) return { type: 'unknown' };
  if (t === '조직도') return { type: 'orgChart' };

  const m = t.match(/^임원일정(?:\s+(\d{1,2})월)?$/);
  if (m) {
    let month = null;
    if (m[1]) {
      const parsed = parseInt(m[1], 10);
      if (parsed >= 1 && parsed <= 12) month = parsed;
    }
    return { type: 'execCalendar', month: month };
  }

  return { type: 'nameSearch', query: t };
}

module.exports = { classify: classify };
