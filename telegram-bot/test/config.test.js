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
