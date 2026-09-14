const test = require('node:test');
const assert = require('node:assert/strict');
const { buildExecCalendarMenu, resolveExecCalendarTarget } = require('../src/commands/execCalendarNav');

test('buildExecCalendarMenu: 이번달/다음달 버튼', function () {
  const menu = buildExecCalendarMenu();
  const data = menu.keyboard.inline_keyboard.flat().map(function (b) { return b.callback_data; });
  assert.deepEqual(data, ['exec:cur', 'exec:next']);
  assert.match(menu.text, /임원일정/);
});

test('resolveExecCalendarTarget: "이번달"은 참조 시각의 연/월 그대로', function () {
  const ref = new Date(2026, 8, 14); // 2026년 9월 14일 (month는 0-based)
  assert.deepEqual(resolveExecCalendarTarget('exec:cur', ref), { year: 2026, month: 9 });
});

test('resolveExecCalendarTarget: "다음달"은 보통 월+1', function () {
  const ref = new Date(2026, 8, 14); // 2026년 9월
  assert.deepEqual(resolveExecCalendarTarget('exec:next', ref), { year: 2026, month: 10 });
});

test('resolveExecCalendarTarget: 12월의 "다음달"은 연도가 넘어가 다음해 1월', function () {
  const ref = new Date(2026, 11, 20); // 2026년 12월
  assert.deepEqual(resolveExecCalendarTarget('exec:next', ref), { year: 2027, month: 1 });
});

test('resolveExecCalendarTarget: 알 수 없는 callback_data면 null', function () {
  assert.equal(resolveExecCalendarTarget('exec:unknown', new Date()), null);
  assert.equal(resolveExecCalendarTarget('org:d:0', new Date()), null);
});
