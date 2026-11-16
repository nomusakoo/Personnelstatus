const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApprovals } = require('../src/auth/approvals');

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'apv-')), 'approvals.json');
}

test('새 요청은 한 번만 알림 대상', function () {
  const a = createApprovals(tmpFile());
  assert.strictEqual(a.request(111, { name: '김철수' }), true);
  assert.strictEqual(a.request(111, { name: '김철수' }), false);
  assert.strictEqual(a.isPending(111), true);
  assert.strictEqual(a.isApproved(111), false);
});

test('승인하면 허용되고 파일에 남는다', function () {
  const f = tmpFile();
  const a = createApprovals(f);
  a.request(222, { name: '이영희' });
  const d = a.decide('222', true, 1);
  assert.strictEqual(d.name, '이영희');
  assert.strictEqual(a.isApproved(222), true);
  assert.strictEqual(a.isPending(222), false);
  const b = createApprovals(f);            // 다시 읽어도 유지 (재시작 대비)
  assert.strictEqual(b.isApproved('222'), true);
});

test('거절하면 다시 요청해도 알림 없음', function () {
  const a = createApprovals(tmpFile());
  a.request(333, { name: '박민수' });
  a.decide(333, false, 1);
  assert.strictEqual(a.isRejected(333), true);
  assert.strictEqual(a.isApproved(333), false);
  assert.strictEqual(a.request(333, { name: '박민수' }), false);
});

test('대기 중이 아니면 결정 불가 (두 번 누르기)', function () {
  const a = createApprovals(tmpFile());
  assert.strictEqual(a.decide(444, true, 1), null);
  a.request(444, { name: '최지우' });
  assert.ok(a.decide(444, true, 1));
  assert.strictEqual(a.decide(444, false, 1), null);
  assert.strictEqual(a.isApproved(444), true);
});
