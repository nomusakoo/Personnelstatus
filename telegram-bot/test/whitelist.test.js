const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowed } = require('../src/auth/whitelist');

test('화이트리스트에 있는 ID는 허용', function () {
  assert.equal(isAllowed(111, ['111', '222']), true);
});

test('화이트리스트에 없는 ID는 거부', function () {
  assert.equal(isAllowed(999, ['111', '222']), false);
});

test('userId가 없으면 거부', function () {
  assert.equal(isAllowed(null, ['111']), false);
  assert.equal(isAllowed(undefined, ['111']), false);
});
