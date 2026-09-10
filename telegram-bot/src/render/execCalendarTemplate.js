const { escapeHtml } = require('../util');
const { BASE_STYLE } = require('./styles');

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

// (year, month, events) -> 스크린샷용 HTML 문서 문자열.
// 이벤트 건수가 적은 편이라 달력 그리드 대신 날짜별 목록형으로 구성한다.
function renderExecCalendarHtml(year, month, events) {
  const byDate = {};
  (events || []).forEach(function (e) {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });
  const dates = Object.keys(byDate).sort();

  let body;
  if (!dates.length) {
    body = '<div class="empty">이번 달 임원일정이 없습니다</div>';
  } else {
    body = dates.map(function (dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      const dow = DOW[d.getDay()];
      const rows = byDate[dateStr]
        .slice()
        .sort(function (a, b) {
          const ta = a.time || '99:99';
          const tb = b.time || '99:99';
          return ta < tb ? -1 : ta > tb ? 1 : 0;
        })
        .map(function (e) {
          const deadlineBadge = e.deadline ? '<span class="badge">⏰ 마감</span>' : '';
          const desc = e.description ? '<div class="desc">' + escapeHtml(e.description) + '</div>' : '';
          return (
            '<div class="event-row">' +
              '<span class="time">' + escapeHtml(e.time || '종일') + '</span>' +
              '<span class="title">' + escapeHtml(e.title) + '</span>' +
              deadlineBadge +
              desc +
            '</div>'
          );
        }).join('');
      return (
        '<div class="date-block">' +
          '<div class="date-head">' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + dow + ')</div>' +
          rows +
        '</div>'
      );
    }).join('');
  }

  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' + BASE_STYLE + `
      .date-block{background:#fff;border-radius:8px;padding:12px 16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.08);}
      .date-head{font-size:13px;font-weight:700;color:#1e3a5f;margin-bottom:6px;}
      .event-row{display:flex;align-items:baseline;gap:10px;font-size:12.5px;padding:4px 0;border-top:1px solid #f0f0f0;flex-wrap:wrap;}
      .date-block .event-row:first-of-type{border-top:none;}
      .time{flex:0 0 46px;color:#888;font-size:11px;}
      .title{font-weight:600;color:#222;}
      .badge{font-size:10px;color:#b12c2c;background:#fee2e2;padding:1px 6px;border-radius:8px;}
      .desc{flex-basis:100%;font-size:11px;color:#888;padding-left:56px;}
    ` + '</style></head><body>' +
      '<h1>' + year + '년 ' + month + '월 임원일정</h1>' +
      body +
    '</body></html>'
  );
}

module.exports = { renderExecCalendarHtml: renderExecCalendarHtml };
