// 들어온 텍스트를 명령 중 하나로 분류한다.
// 고정 키워드(조직도/임원일정/도움말 등)를 먼저 검사하고, 나머지는 전부 이름 검색
// (index.js에서 조직명/대시보드 키워드로 한 번 더 걸러진 뒤 최종적으로 이름 검색)으로 취급한다.
function classify(text) {
  const t = (text || '').trim();
  if (!t) return { type: 'unknown' };
  if (t === '/start' || t === '도움말') return { type: 'help' };
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
