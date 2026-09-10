const { createClient } = require('@supabase/supabase-js');

// service_role 키 사용 — RLS를 우회하는 신뢰된 서버 프로세스.
// 이 클라이언트는 이 봇 프로세스 밖으로 절대 노출되지 않아야 하며,
// repository.js를 통한 읽기 전용 쿼리 외에는 사용하지 않는다.
function createSupabaseClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

module.exports = { createSupabaseClient: createSupabaseClient };
