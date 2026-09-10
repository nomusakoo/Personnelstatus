const test = require('node:test');
const assert = require('node:assert/strict');
const { formatExecCalendarText } = require('../src/render/execCalendarText');

test('이벤트 없으면 빈 상태 메시지', function () {
  const text = formatExecCalendarText(2026, 9, []);
  assert.match(text, /이번 달 임원일정이 없습니다/);
});

test('날짜별로 그룹핑되고 시간순 정렬됨', function () {
  const events = [
    { date: '2026-09-05', time: '14:00', title: '임원 간담회', description: '', deadline: false },
    { date: '2026-09-05', time: '10:00', title: '이사회', description: '', deadline: false },
    { date: '2026-09-12', time: '', title: '월례 보고', description: '', deadline: false },
  ];
  const text = formatExecCalendarText(2026, 9, events);
  assert.match(text, /9월 5일/);
  assert.match(text, /9월 12일/);
  assert.match(text, /종일 월례 보고/);
  const idxBoard = text.indexOf('이사회');
  const idxMeeting = text.indexOf('임원 간담회');
  assert.ok(idxBoard < idxMeeting, '10:00 이사회가 14:00 간담회보다 먼저 나와야 함');
});

test('마감 표시와 외부 연동 표시', function () {
  const events = [
    { date: '2026-09-05', time: '10:00', title: '보고서 마감', description: '', deadline: true },
    { date: '2026-09-05', time: '11:00', title: '외부 회의', description: '', deadline: false, _external: true },
  ];
  const text = formatExecCalendarText(2026, 9, events);
  assert.match(text, /보고서 마감 ⏰마감/);
  assert.match(text, /외부 회의 \(외부\)/);
});

test('설명(description)이 있으면 다음 줄에 표시', function () {
  const events = [{ date: '2026-09-05', time: '10:00', title: '이사회', description: '회의실 A', deadline: false }];
  const text = formatExecCalendarText(2026, 9, events);
  assert.match(text, /\(회의실 A\)/);
});
