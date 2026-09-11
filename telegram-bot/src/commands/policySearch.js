const { bestFuzzyMatches, normalizeForMatch, htmlToPlainText } = require('../util');

function _getTitle(p) { return p.title; }

// 정확히 일치하는 항목만 찾는다(오타 허용 없음). "총원" 사례처럼 애매한 다른 키워드와
// 겹치지 않는, 확실한 매칭만 조직명/대시보드 키워드보다 먼저 처리하기 위함.
function matchPolicyExact(query, policies) {
  const nq = normalizeForMatch(query);
  if (!nq || !policies || !policies.length) return null;
  const exact = policies.filter(function (p) { return normalizeForMatch(p.title) === nq; });
  if (exact.length === 1) return { item: exact[0] };
  if (exact.length > 1) return { multiple: exact.map(function (p) { return p.title; }) };
  return null;
}

// 정확 일치 > 부분일치(양방향) > (오타 등을 감안해 가장 유사한 것만) 순으로 넓혀가며 찾는다.
function matchPolicy(query, policies) {
  if (!policies || !policies.length) return null;
  const nq = normalizeForMatch(query);
  if (!nq) return null;

  const exact = matchPolicyExact(query, policies);
  if (exact) return exact;

  const substring = policies.filter(function (p) {
    const t = normalizeForMatch(p.title);
    return t && (t.indexOf(nq) !== -1 || nq.indexOf(t) !== -1);
  });
  if (substring.length === 1) return { item: substring[0] };
  if (substring.length > 1) return { multiple: substring.map(function (p) { return p.title; }) };

  const fuzzy = bestFuzzyMatches(policies, _getTitle, query);
  if (fuzzy.length === 1) return { item: fuzzy[0] };
  if (fuzzy.length > 1) return { multiple: fuzzy.map(function (p) { return p.title; }) };

  return null;
}

// match({item} | {multiple}) → 안내 문구 또는 상세 내용 텍스트.
function formatPolicyText(query, match) {
  if (match.multiple) {
    return (
      "'" + query + "'에 해당하는 제도가 여러 개 있습니다: " + match.multiple.join(', ') +
      '\n항목명을 더 구체적으로 입력해 주세요.'
    );
  }
  const item = match.item;
  const body = htmlToPlainText(item.content);
  return '📋 ' + item.title + '\n\n' + (body || '내용이 없습니다.');
}

module.exports = {
  matchPolicyExact: matchPolicyExact,
  matchPolicy: matchPolicy,
  formatPolicyText: formatPolicyText,
};
