const DOW = ['일', '월', '화', '수', '목', '금', '토'];

// (year, month, events) -> 텔레그램 채팅에 바로 보낼 평문 텍스트.
function formatExecCalendarText(year, month, events) {
  const lines = ['📅 ' + year + '년 ' + month + '월 임원일정', ''];

  const byDate = {};
  (events || []).forEach(function (e) {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });
  const dates = Object.keys(byDate).sort();

  if (!dates.length) {
    lines.push('이번 달 임원일정이 없습니다');
    return lines.join('\n');
  }

  dates.forEach(function (dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = DOW[d.getDay()];
    lines.push((d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + dow + ')');

    byDate[dateStr]
      .slice()
      .sort(function (a, b) {
        const ta = a.time || '99:99';
        const tb = b.time || '99:99';
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      })
      .forEach(function (e) {
        const deadlineTag = e.deadline ? ' ⏰마감' : '';
        const externalTag = e._external ? ' (외부)' : '';
        lines.push('  ' + (e.time || '종일') + ' ' + e.title + deadlineTag + externalTag);
        if (e.description) lines.push('    (' + e.description + ')');
      });
    lines.push('');
  });

  return lines.join('\n').trim();
}

module.exports = { formatExecCalendarText: formatExecCalendarText };
