// hr_policies.content(HTML 문서)를 텔레그램 HTML parse_mode용 메시지로 바꾼다.
// <table>은 고정폭 <pre> 블록으로 렌더링해 열이 맞춰진 표처럼 보이게 하고(일반 평문
// 메시지는 가변폭 글꼴이라 공백만으로는 절대 줄이 안 맞음), 그 외 텍스트(h1~h6, p, br,
// li)는 굵은 제목/줄바꿈 정도만 살려서 보여준다. 별도 HTML 파서 없이 정규식으로 처리하는
// 수준이라 아주 복잡한 레이아웃까지 완벽히 재현하진 않는다.

function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _stripAllTags(s) {
  return String(s).replace(/<[^>]+>/g, '');
}

function _decodeEntities(s) {
  return String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

// 한글 등 전각 문자는 고정폭 글꼴에서 폭이 2배로 보여, 단순 문자 수로 정렬하면 어긋난다.
function _visualWidth(s) {
  let w = 0;
  for (const ch of String(s)) {
    w += /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿＀-￯]/.test(ch) ? 2 : 1;
  }
  return w;
}

// <table> 하나를 "열 맞춘 고정폭 텍스트 + <pre>"로 변환. 헤더행 다음엔 구분선을 넣고,
// style="text-align:right"가 걸린 열은 오른쪽 정렬한다(원본 표의 숫자 열 표시를 따라감).
function _renderTable(tableInnerHtml) {
  const rows = [];
  const alignRight = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  let firstRowIsHeader = false;
  let sawFirstRow = false;
  while ((rm = rowRe.exec(tableInnerHtml)) !== null) {
    const cells = [];
    let rowHasTh = false;
    const cellRe = /<(t[hd])\b([^>]*)>([\s\S]*?)<\/t[hd]>/gi;
    let cm;
    let colIdx = 0;
    while ((cm = cellRe.exec(rm[1])) !== null) {
      const tag = cm[1];
      const attrs = cm[2] || '';
      const text = _decodeEntities(_stripAllTags(cm[3])).replace(/\s+/g, ' ').trim();
      cells.push(text);
      if (/^th$/i.test(tag)) rowHasTh = true;
      if (/text-align\s*:\s*right/i.test(attrs)) alignRight[colIdx] = true;
      colIdx += 1;
    }
    if (cells.length) {
      if (!sawFirstRow) { firstRowIsHeader = rowHasTh; sawFirstRow = true; }
      rows.push(cells);
    }
  }
  if (!rows.length) return '';

  const colCount = rows.reduce(function (max, r) { return Math.max(max, r.length); }, 0);
  const widths = [];
  for (let c = 0; c < colCount; c += 1) {
    let w = 0;
    rows.forEach(function (r) { w = Math.max(w, _visualWidth(r[c] || '')); });
    widths[c] = w;
  }

  const lines = rows.map(function (r) {
    const cells = [];
    for (let c = 0; c < colCount; c += 1) {
      const val = r[c] || '';
      const pad = widths[c] - _visualWidth(val);
      const padding = pad > 0 ? ' '.repeat(pad) : '';
      cells.push(alignRight[c] ? padding + val : val + padding);
    }
    return cells.join('  ');
  });
  if (lines.length > 1 && firstRowIsHeader) {
    const totalWidth = widths.reduce(function (a, b) { return a + b; }, 0) + (colCount - 1) * 2;
    lines.splice(1, 0, '-'.repeat(totalWidth));
  }
  return '<pre>' + _escapeHtml(lines.join('\n')) + '</pre>';
}

// 표가 아닌 나머지 텍스트: 제목(h1~h6)은 굵게, br/p/div/li 등은 줄바꿈으로.
// 굵게 표시할 텍스트는 태그 제거 전에 미리 뽑아 이스케이프해 두고, 나머지 본문을
// 전부 이스케이프한 "뒤에" 마커를 실제 <b> 태그로 치환한다(태그가 이중 이스케이프되지
// 않도록 순서를 지킴).
function _renderText(html) {
  let s = String(html);
  s = s.replace(/<img[^>]*>/gi, '[이미지 생략]');
  const headings = [];
  s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, function (_, inner) {
    headings.push(_decodeEntities(_stripAllTags(inner)).trim());
    return '\nH' + (headings.length - 1) + '\n';
  });
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '- ');
  s = s.replace(/<\/(p|div|li|tr|section|article)>/gi, '\n');
  s = _stripAllTags(s);
  s = _decodeEntities(s);
  s = _escapeHtml(s);
  s = s.replace(/H(\d+)/g, function (_, idx) {
    return '<b>' + _escapeHtml(headings[Number(idx)]) + '</b>';
  });
  s = s.split('\n').map(function (l) { return l.trim(); }).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

// content 전체를 <table>과 그 사이 텍스트로 순서대로 나눠 각각 렌더링한 뒤 이어붙인다.
function _renderBlocks(html) {
  let rest = String(html || '');
  rest = rest.replace(/<!--[\s\S]*?-->/g, '');
  rest = rest.replace(/<head[\s\S]*?<\/head>/gi, '');
  rest = rest.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');

  const blocks = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let lastIndex = 0;
  let m;
  while ((m = tableRe.exec(rest)) !== null) {
    const before = rest.slice(lastIndex, m.index);
    if (before.trim()) blocks.push(_renderText(before));
    const table = _renderTable(m[1]);
    if (table) blocks.push(table);
    lastIndex = tableRe.lastIndex;
  }
  const tail = rest.slice(lastIndex);
  if (tail.trim()) blocks.push(_renderText(tail));

  return blocks.filter(Boolean).join('\n\n');
}

// item({title, content}) -> 텔레그램 HTML parse_mode로 보낼 전체 메시지 문자열.
function renderPolicyContentHtml(item) {
  const body = _renderBlocks(item.content);
  return '📋 <b>' + _escapeHtml(item.title) + '</b>\n\n' + (body || '내용이 없습니다.');
}

module.exports = { renderPolicyContentHtml: renderPolicyContentHtml };
