const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../src/data/repository');

// 체이닝 가능한 최소 Supabase 클라이언트 목업
function makeMockSb(rows) {
  return {
    from: function (table) {
      const builder = {
        _table: table,
        select: function () { return builder; },
        gte: function () { return builder; },
        lte: function () { return builder; },
        order: function () { return builder; },
        then: function (resolve) { return resolve({ data: rows, error: null }); },
      };
      return builder;
    },
  };
}

test('getExternalExecEventsForMonth: hr_exec_events를 조회하고 _external:true를 붙임', async function () {
  const rows = [{ id: 'x1', date: '2026-09-05', time: '10:00', title: '외부 이사회', description: '', deadline: false }];
  const sb2 = makeMockSb(rows);
  const result = await repository.getExternalExecEventsForMonth(sb2, 2026, 9);
  assert.equal(result.length, 1);
  assert.equal(result[0]._external, true);
  assert.equal(result[0].title, '외부 이사회');
});

test('getExecEventsForMonth: exec_events에는 _external을 붙이지 않음', async function () {
  const rows = [{ id: 'e1', date: '2026-09-05', time: '10:00', title: '자체 이사회', description: '', deadline: false }];
  const sb = makeMockSb(rows);
  const result = await repository.getExecEventsForMonth(sb, 2026, 9);
  assert.equal(result.length, 1);
  assert.equal(result[0]._external, undefined);
});
