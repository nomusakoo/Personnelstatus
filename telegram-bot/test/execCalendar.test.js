const test = require('node:test');
const assert = require('node:assert/strict');
const { getExecCalendarText, getExecCalendarTextForYearMonth } = require('../src/commands/execCalendar');

function makeMockSb(rowsByTable) {
  return {
    from: function (table) {
      const builder = {
        select: function () { return builder; },
        gte: function () { return builder; },
        lt: function () { return builder; },
        order: function () { return builder; },
        then: function (resolve) { return resolve({ data: (rowsByTable && rowsByTable[table]) || [], error: null }); },
      };
      return builder;
    },
  };
}

test('getExecCalendarTextForYearMonth: 지정한 연/월 기준으로 텍스트를 만듦', async function () {
  const sb = makeMockSb({
    exec_events: [{ id: 'e1', date: '2027-01-05', time: '10:00', title: '신년 이사회', description: '', deadline: false }],
  });
  const text = await getExecCalendarTextForYearMonth(sb, 2027, 1, null);
  assert.match(text, /2027년 1월 임원일정/);
  assert.match(text, /신년 이사회/);
});

test('getExecCalendarTextForYearMonth: sb2가 있으면 외부 연동 일정도 합쳐서 보여줌', async function () {
  const sb = makeMockSb({ exec_events: [] });
  const sb2 = makeMockSb({
    hr_exec_events: [{ id: 'x1', date: '2027-01-10', time: '14:00', title: '외부 미팅', description: '', deadline: false }],
  });
  const text = await getExecCalendarTextForYearMonth(sb, 2027, 1, sb2);
  assert.match(text, /외부 미팅/);
});

test('getExecCalendarText: month를 안 주면 이번 달(현재 연도) 기준으로 조회', async function () {
  const sb = makeMockSb({ exec_events: [] });
  const now = new Date();
  const text = await getExecCalendarText(sb, null, null);
  assert.match(text, new RegExp(now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월 임원일정'));
});
