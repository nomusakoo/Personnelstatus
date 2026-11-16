// 권한 요청 승인 목록 (2026-11-16)
// 미등록 사용자가 성명을 보내면 '대기(pending)'로 기록하고 운영자에게 알림 → 운영자가 버튼으로
// 승인(approved)/거절(rejected). 승인된 사람은 .env의 ALLOWED_TELEGRAM_IDS와 별개로 이 파일로 허용된다
// (재시작 불필요). .env는 코드로 고치지 않는다. 파일 위치는 data/approvals.json (git 제외).
const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'approvals.json');

function emptyState() {
  return { pending: {}, approved: {}, rejected: {} };
}

function createApprovals(file) {
  file = file || DEFAULT_FILE;
  let state = emptyState();
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    state = Object.assign(emptyState(), raw);
  } catch (e) {
    // 파일이 없거나 깨졌으면 빈 목록으로 시작 (깨진 파일은 덮어쓰기 전에 남겨 둔다)
    if (e.code !== 'ENOENT') {
      try { fs.copyFileSync(file, file + '.broken-' + Date.now()); } catch (_) { /* 무시 */ }
      console.error('[approvals] 승인 목록을 읽지 못해 빈 목록으로 시작합니다:', e.message);
    }
  }

  function save() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  }

  function key(id) { return String(id); }

  return {
    isApproved: function (id) { return id != null && Object.prototype.hasOwnProperty.call(state.approved, key(id)); },
    isRejected: function (id) { return id != null && Object.prototype.hasOwnProperty.call(state.rejected, key(id)); },
    isPending: function (id) { return id != null && Object.prototype.hasOwnProperty.call(state.pending, key(id)); },
    get: function (id) {
      const k = key(id);
      return state.pending[k] || state.approved[k] || state.rejected[k] || null;
    },
    // 새 요청이면 true (알림을 보내야 함). 이미 대기·승인·거절된 사람이면 false.
    request: function (id, info) {
      const k = key(id);
      if (state.pending[k] || state.approved[k] || state.rejected[k]) return false;
      state.pending[k] = Object.assign({}, info, { requestedAt: new Date().toISOString() });
      save();
      return true;
    },
    // 대기 중인 사람만 결정할 수 있다. 결정한 항목을 돌려주고, 없으면 null.
    decide: function (id, approve, adminId) {
      const k = key(id);
      const item = state.pending[k];
      if (!item) return null;
      delete state.pending[k];
      const done = Object.assign({}, item, { decidedAt: new Date().toISOString(), decidedBy: String(adminId) });
      if (approve) state.approved[k] = done; else state.rejected[k] = done;
      save();
      return done;
    },
  };
}

module.exports = { createApprovals: createApprovals, DEFAULT_FILE: DEFAULT_FILE };
