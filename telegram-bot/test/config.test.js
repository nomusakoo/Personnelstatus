const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

const VALID_ENV = {
  TELEGRAM_BOT_TOKEN: 'dummy-token',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'dummy-key',
  ALLOWED_TELEGRAM_IDS: '111, 222 ,333',
};

test('필수 환경변수가 모두 있으면 정상 로드', function () {
  const cfg = loadConfig(VALID_ENV);
  assert.equal(cfg.telegramToken, 'dummy-token');
  assert.deepEqual(cfg.allowedIds, ['111', '222', '333']);
});

test('필수 환경변수 누락 시 에러 발생 (fail-fast)', function () {
  const env = Object.assign({}, VALID_ENV);
  delete env.TELEGRAM_BOT_TOKEN;
  assert.throws(function () { loadConfig(env); }, /TELEGRAM_BOT_TOKEN/);
});

test('외부 연동(SUPABASE2_*)이 없으면 null - 필수 아님', function () {
  const cfg = loadConfig(VALID_ENV);
  assert.equal(cfg.supabase2Url, null);
  assert.equal(cfg.supabase2ServiceRoleKey, null);
});

test('외부 연동(SUPABASE2_*)이 있으면 값이 들어감', function () {
  const env = Object.assign({}, VALID_ENV, {
    SUPABASE2_URL: 'https://external.supabase.co',
    SUPABASE2_SERVICE_ROLE_KEY: 'external-key',
  });
  const cfg = loadConfig(env);
  assert.equal(cfg.supabase2Url, 'https://external.supabase.co');
  assert.equal(cfg.supabase2ServiceRoleKey, 'external-key');
});
