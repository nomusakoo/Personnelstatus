const test = require('node:test');
const assert = require('node:assert/strict');
const { renderExecCalendarHtml } = require('../src/render/execCalendarTemplate');

test('이벤트 없으면 빈 상태 메시지', function () {
  const html = renderExecCalendarHtml(2026, 9, []);
  assert.match(html, /이번 달 임원일정이 없습니다/);
});

test('날짜별로 그룹핑되고 시간순 정렬됨', function () {
  const events = [
    { date: '2026-09-05', time: '14:00', title: '임원 간담회', description: '', deadline: false },
    { date: '2026-09-05', time: '10:00', title: '이사회', description: '', deadline: false },
    { date: '2026-09-12', time: '', title: '월례 보고', description: '', deadline: false },
  ];
  const html = renderExecCalendarHtml(2026, 9, events);
  assert.match(html, /9월 5일/);
  assert.match(html, /9월 12일/);
  assert.match(html, /이사회/);
  assert.match(html, /임원 간담회/);
  assert.match(html, /월례 보고/);
  assert.match(html, /종일/); // time 없는 이벤트
  const idxBoard = html.indexOf('이사회');
  const idxMeeting = html.indexOf('임원 간담회');
  assert.ok(idxBoard < idxMeeting, '10:00 이사회가 14:00 간담회보다 먼저 나와야 함');
});

test('마감 표시 배지', function () {
  const events = [{ date: '2026-09-05', time: '10:00', title: '보고서 마감', description: '', deadline: true }];
  const html = renderExecCalendarHtml(2026, 9, events);
  assert.match(html, /마감/);
});

test('제목에 HTML 특수문자가 있어도 이스케이프됨', function () {
  const events = [{ date: '2026-09-05', time: '10:00', title: '<b>강조</b>', description: '', deadline: false }];
  const html = renderExecCalendarHtml(2026, 9, events);
  assert.doesNotMatch(html, /<b>강조<\/b>/);
});

test('외부 연동 일정(_external)은 "외부" 배지 표시, 자체 일정에는 안 붙음', function () {
  const events = [
    { date: '2026-09-05', time: '10:00', title: '자체 일정', description: '', deadline: false },
    { date: '2026-09-05', time: '11:00', title: '외부 연동 일정', description: '', deadline: false, _external: true },
  ];
  const html = renderExecCalendarHtml(2026, 9, events);
  const badgeCount = (html.match(/class="badge ext"/g) || []).length;
  assert.equal(badgeCount, 1, '외부 일정 1건에만 배지가 붙어야 함');
});
