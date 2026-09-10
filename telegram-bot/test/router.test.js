const test = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('../src/commands/router');

test('조직도 키워드 정확히 인식', function () {
  assert.deepEqual(classify('조직도'), { type: 'orgChart' });
});

test('조직도 앞뒤 공백 허용', function () {
  assert.deepEqual(classify('  조직도  '), { type: 'orgChart' });
});

test('임원일정 (월 없음) 인식', function () {
  assert.deepEqual(classify('임원일정'), { type: 'execCalendar', month: null });
});

test('임원일정 10월 인식', function () {
  assert.deepEqual(classify('임원일정 10월'), { type: 'execCalendar', month: 10 });
});

test('임원일정 범위 밖 월은 무시하고 이번 달로 처리', function () {
  assert.deepEqual(classify('임원일정 13월'), { type: 'execCalendar', month: null });
});

test('나머지 텍스트는 이름 검색으로 분류', function () {
  assert.deepEqual(classify('홍길동'), { type: 'nameSearch', query: '홍길동' });
});

test('빈 문자열은 unknown', function () {
  assert.deepEqual(classify(''), { type: 'unknown' });
  assert.deepEqual(classify('   '), { type: 'unknown' });
});

test('조직도라는 이름의 직원이 있어도 명령이 우선 (알려진 한계, 문서화됨)', function () {
  assert.deepEqual(classify('조직도'), { type: 'orgChart' });
});
