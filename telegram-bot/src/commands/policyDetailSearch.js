const { parsePolicySections, extractRowParts, escapeHtml } = require('../render/policyContentHtml');
const { normalizeForMatch } = require('../util');

// "본인결혼"/"자녀 사망"처럼 [상황(결혼/사망/회갑 등)] + [대상(본인/자녀/배우자 등)]을
// 조합해 입력하면, 제도 전체가 아니라 그 표의 "그 한 줄"만 찾아 보여준다. 여러 제도
// (예: 경조휴가·경조금)에 같은 상황+대상 조합이 있으면 한 번에 묶어서 보여준다.
//
// 매칭 방식: 정규화한 쿼리를 모든 지점에서 둘로 나눠(예: "본인결혼" -> "본인"+"결혼"),
// 한쪽이 표 바로 위 제목(상황, 예: "결혼" 또는 "사망 휴가")에 부분일치하고 다른 한쪽이
// 그 행의 라벨 컬럼(대상, 예: "본인")에 부분일치하면 그 행을 매칭시킨다. 순서(대상+상황,
// 상황+대상)는 상관없다. 너무 짧은 조합은 오검색 위험이 커서 최소 길이를 둔다.
const MIN_QUERY_LEN = 4;
const MIN_PART_LEN = 2;

function _norm(s) {
  return normalizeForMatch(s).replace(/·/g, '');
}

function _rowLabelText(table, row) {
  const parts = [];
  for (let c = 0; c < table.roles.length; c += 1) {
    if (table.roles[c] === 'label' && row[c]) parts.push(row[c]);
  }
  return parts.join(' ');
}

// query가 [상황]+[대상] 조합에 해당하는 행을 정책 전체에서 찾는다. 못 찾으면 null.
function findPolicyDetailMatches(query, policies) {
  const nq = _norm(query);
  if (nq.length < MIN_QUERY_LEN) return null;

  const hits = [];
  (policies || []).forEach(function (policy) {
    const sections = parsePolicySections(policy.content);
    sections.forEach(function (section) {
      const headingN = _norm(section.heading);
      if (!headingN) return;
      section.table.rows.forEach(function (row) {
        const labelN = _norm(_rowLabelText(section.table, row));
        if (!labelN) return;
        for (let i = MIN_PART_LEN; i <= nq.length - MIN_PART_LEN; i += 1) {
          const left = nq.slice(0, i);
          const right = nq.slice(i);
          const matches =
            (headingN.indexOf(left) !== -1 && labelN.indexOf(right) !== -1) ||
            (headingN.indexOf(right) !== -1 && labelN.indexOf(left) !== -1);
          if (matches) {
            const parts = extractRowParts(section.table, row);
            hits.push({
              policyTitle: policy.title,
              heading: section.heading,
              labelText: parts.labelText,
              valueText: parts.valueText,
              remark: parts.remark,
            });
            break;
          }
        }
      });
    });
  });
  return hits.length ? hits : null;
}

// 같은 (상황, 대상) 조합으로 여러 제도에서 찾은 결과를 하나로 묶어 보여준다.
// 제도마다 상황 제목의 표현이 조금씩 다를 수 있어(예: "사망" vs "사망 휴가"),
// 묶는 기준은 대상(라벨)만 쓰고 — 어차피 hits는 이미 이번 query 하나로 걸러진
// 결과라 라벨만으로 묶어도 서로 다른 상황이 잘못 합쳐질 위험은 사실상 없다 —
// 화면에 보여줄 상황 제목은 그룹 안에서 가장 짧은(더 간결한) 표현을 고른다.
function formatPolicyDetailMatches(query, hits) {
  const groups = {};
  const order = [];
  hits.forEach(function (h) {
    const key = _norm(h.labelText);
    if (!groups[key]) { groups[key] = { heading: h.heading, labelText: h.labelText, entries: [] }; order.push(key); }
    else if (h.heading && h.heading.length < groups[key].heading.length) { groups[key].heading = h.heading; }
    groups[key].entries.push(h);
  });

  const blocks = order.map(function (key) {
    const g = groups[key];
    const title = (g.heading ? g.heading + ' · ' : '') + g.labelText;
    const lines = g.entries.map(function (h) {
      let line = '[' + escapeHtml(h.policyTitle) + '] ' + escapeHtml(h.valueText || '-');
      if (h.remark) line += '\n    (' + escapeHtml(h.remark) + ')';
      return line;
    });
    return '<b>' + escapeHtml(title) + '</b>\n' + lines.join('\n');
  });

  return { html: '📋 상세 조회\n\n' + blocks.join('\n\n') };
}

module.exports = {
  findPolicyDetailMatches: findPolicyDetailMatches,
  formatPolicyDetailMatches: formatPolicyDetailMatches,
};
