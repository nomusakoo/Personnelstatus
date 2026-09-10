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
        lt: function () { return builder; },
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

// 30일까지만 있는 달(9월)을 존재하지 않는 "2026-09-31"로 상한을 잡으면
// Postgres가 22008(date/time field value out of range) 오류를 낸다.
// 다음 달 1일 미만(<)으로 비교하도록 고쳐 이 회귀를 방지한다.
function makeBoundaryCapturingMockSb() {
  const calls = { gte: null, lt: null };
  const sb = {
    from: function () {
      const builder = {
        select: function () { return builder; },
        gte: function (col, val) { calls.gte = val; return builder; },
        lt: function (col, val) { calls.lt = val; return builder; },
        order: function () { return builder; },
        then: function (resolve) { return resolve({ data: [], error: null }); },
      };
      return builder;
    },
  };
  return { sb: sb, calls: calls };
}

test('getExecEventsForMonth: 9월(30일까지)이어도 존재하지 않는 날짜로 상한을 만들지 않음', async function () {
  const mock = makeBoundaryCapturingMockSb();
  await repository.getExecEventsForMonth(mock.sb, 2026, 9);
  assert.equal(mock.calls.gte, '2026-09-01');
  assert.equal(mock.calls.lt, '2026-10-01');
});

test('getExecEventsForMonth: 12월이면 다음 해 1월 1일 미만으로 상한을 잡음', async function () {
  const mock = makeBoundaryCapturingMockSb();
  await repository.getExecEventsForMonth(mock.sb, 2026, 12);
  assert.equal(mock.calls.gte, '2026-12-01');
  assert.equal(mock.calls.lt, '2027-01-01');
});
