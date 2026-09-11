// "연도별 인력현황"처럼 표(연도별 열)가 많고 방대해 텍스트로는 정리가 안 되는 제도
// 항목을, hr_policies.content의 원본 <table> 구조를 그대로 살려 깔끔한 이미지 한 장으로
// 렌더링하기 위한 HTML을 만든다. (실제 PNG 변환은 render/screenshot.js가 담당)
//
// 텍스트 렌더링(policyContentHtml.js)과 달리 표를 행 단위로 풀어쓰지 않는다 — 이미지는
// 좁은 화면에서 줄바꿈될 걱정이 없고(사진처럼 확대/축소해서 보므로), 오히려 원본처럼
// 열이 맞춰진 표 형태가 연도별 추이를 한눈에 비교하기에 더 낫기 때문이다.

function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// content가 <!DOCTYPE html><html><head>...</head><body>...</body></html> 형태로
// 저장돼 있으므로 <body> 안쪽만 뽑아 쓴다(그래야 원본 <head>의 <title>/<meta>가
// 이 함수가 만드는 페이지의 것과 안 섞인다). <body> 태그가 없는 content(단순 조각)면
// 그대로 전체를 쓴다.
function _extractBody(html) {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(String(html || ''));
  return m ? m[1] : String(html || '');
}

// "총원"/"계"/"합계" 같은 합계 행은 굵게 강조해 다른 행과 구분되도록 tr에 클래스를 붙인다.
function _markTotalRows(bodyHtml) {
  return bodyHtml.replace(/<tr(\s[^>]*)?>(\s*<td[^>]*>(총원|계|합계)<\/td>)/g, '<tr class="total-row">$2');
}

const PAGE_CSS = (
  "body{margin:0;padding:28px 32px;max-width:1200px;" +
  "font-family:'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#222;background:#fff;}" +
  "h1{font-size:22px;margin:0 0 20px;}" +
  "h2{font-size:16px;margin:26px 0 4px;padding-bottom:4px;border-bottom:2px solid #333;}" +
  "section:first-of-type h2{margin-top:0;}" +
  "p.note{font-size:12px;color:#777;margin:0 0 8px;}" +
  "table{border-collapse:collapse;margin-bottom:6px;width:100%;}" +
  "th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px;white-space:nowrap;}" +
  "th{background:#eef1f5;font-weight:600;}" +
  "tbody tr:nth-child(even) td{background:#f8fafc;}" +
  "td:first-child,th:first-child{text-align:left;font-weight:600;background:#f4f4f4;}" +
  "tr.total-row td{font-weight:700;background:#eef7ee;}"
);

// item({title, content}) -> 텔레그램에 문서(파일)로 보낼 PNG를 만들기 위한 전체 HTML 문자열.
function renderPolicyImageHtml(item) {
  const body = _markTotalRows(_extractBody(item.content));
  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>' + PAGE_CSS + '</style></head><body>' +
    '<h1>' + _escapeHtml(item.title) + '</h1>' +
    body +
    '</body></html>'
  );
}

module.exports = { renderPolicyImageHtml: renderPolicyImageHtml };
