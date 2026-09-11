// join_date(YYYY-MM-DD)로부터 "N년차" 라벨 계산. 유효하지 않으면 null.
function computeTenureLabel(joinDate, referenceDate) {
  if (!joinDate) return null;
  const joined = new Date(joinDate);
  if (isNaN(joined.getTime())) return null;
  const ref = referenceDate || new Date();
  let years = ref.getFullYear() - joined.getFullYear();
  const monthDiff = ref.getMonth() - joined.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < joined.getDate())) {
    years -= 1;
  }
  if (years < 0) return null;
  return (years + 1) + '년차';
}

// 텔레그램 메시지는 4096자 제한이 있어, 줄 단위로 나눠서 여러 메시지로 쪼갠다.
// (한 줄 자체가 maxLen을 넘는 비정상적인 경우는 그냥 그 줄만 별도 청크로 보냄)
function chunkText(text, maxLen) {
  maxLen = maxLen || 3500;
  const lines = String(text).split('\n');
  const chunks = [];
  let current = '';
  lines.forEach(function (line) {
    const candidate = current ? current + '\n' + line : line;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

// 조직명/이름 비교 시 공백 유무나 영문 대소문자(예: "SM부문" vs "sm 부문") 때문에
// 매칭이 실패하지 않도록 정규화한다.
function normalizeForMatch(s) {
  return (s || '').replace(/\s+/g, '').trim().toLowerCase();
}

// 표준 편집거리(레벤슈타인 거리) — 두 문자열을 서로 바꾸는 데 필요한 최소 삽입/삭제/치환 횟수
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) dp.push([i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// 편집거리를 0(전혀 다름)~1(완전히 같음) 사이의 유사도로 정규화
function similarityRatio(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// 이름/조직명 등 짧은 텍스트를 오타에 관대하게 검색하기 위한 기본 임계값.
// 정확히 일치하거나 부분일치(substring)하면 당연히 매칭되고, 그마저도 안 되면
// 이 임계값 이상 유사한 후보 중 "가장 유사한" 것만 매칭시킨다(아래 bestFuzzyMatches 참고).
const FUZZY_MATCH_THRESHOLD = 0.3;

// 정확 일치/부분일치가 전혀 없을 때 마지막으로 시도하는 오타 허용 매칭.
// 후보들 중 query와 가장 유사도가 높은 것들만 골라 반환한다(임계값만 넘으면 전부
// 반환하면, 예를 들어 "재무팀"/"총무팀"처럼 어중간하게 비슷한 이름들이 진짜 오타
// 대상인 "인사노무팀"과 함께 걸려 나오는 문제가 생기므로, 최고 유사도만 취한다).
// 최고 유사도가 FUZZY_MATCH_THRESHOLD 미만이면 빈 배열.
function bestFuzzyMatches(items, getName, query) {
  const q = normalizeForMatch(query);
  if (!q) return [];
  let best = 0;
  const scored = items.map(function (it) {
    const name = normalizeForMatch(getName(it));
    const score = name ? similarityRatio(name, q) : 0;
    return { it: it, score: score };
  });
  scored.forEach(function (s) { if (s.score > best) best = s.score; });
  if (best < FUZZY_MATCH_THRESHOLD) return [];
  return scored.filter(function (s) { return s.score === best; }).map(function (s) { return s.it; });
}

// 제도(hr_policies) 테이블의 content가 통짜 HTML 문서(구글독스 등에서 내보낸 형태)라
// 텔레그램 채팅에 그대로 보낼 수 없다. 태그를 벗겨 평문으로 바꾼다 — 별도 HTML 파서
// 의존성 없이 정규식으로 처리하는 수준(표/복잡한 레이아웃은 완벽히 재현되지 않는다).
function htmlToPlainText(html) {
  if (!html) return '';
  let text = String(html);
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  text = text.replace(/<img[^>]*>/gi, '[이미지 생략]');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '- ');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
  text = text.split('\n').map(function (l) { return l.trim(); }).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

module.exports = {
  computeTenureLabel: computeTenureLabel,
  chunkText: chunkText,
  normalizeForMatch: normalizeForMatch,
  levenshtein: levenshtein,
  similarityRatio: similarityRatio,
  bestFuzzyMatches: bestFuzzyMatches,
  htmlToPlainText: htmlToPlainText,
  FUZZY_MATCH_THRESHOLD: FUZZY_MATCH_THRESHOLD,
};
