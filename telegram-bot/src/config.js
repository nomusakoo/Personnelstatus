require('dotenv').config();

const REQUIRED_VARS = [
  'TELEGRAM_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ALLOWED_TELEGRAM_IDS',
];

function loadConfig(env) {
  env = env || process.env;
  const missing = REQUIRED_VARS.filter(function (key) {
    return !env[key];
  });
  if (missing.length) {
    throw new Error(
      '필수 환경변수가 누락되었습니다: ' + missing.join(', ') +
      '\n.env 파일을 확인하세요 (.env.example 참고).'
    );
  }
  const allowedIds = String(env.ALLOWED_TELEGRAM_IDS)
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);

  // 외부 연동 임원일정(선택) — 둘 다 채워져 있을 때만 활성화
  const supabase2Url = env.SUPABASE2_URL || null;
  const supabase2ServiceRoleKey = env.SUPABASE2_SERVICE_ROLE_KEY || null;

  return {
    telegramToken: env.TELEGRAM_BOT_TOKEN,
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    allowedIds: allowedIds,
    supabase2Url: supabase2Url,
    supabase2ServiceRoleKey: supabase2ServiceRoleKey,
  };
}

module.exports = { loadConfig: loadConfig, REQUIRED_VARS: REQUIRED_VARS };
