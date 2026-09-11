// hr_policies.content(HTML 문서)를 텔레그램 채팅에 보낼 형태로 바꾼다.
// <table>은 "열을 맞춘 고정폭 표"가 아니라 "행 하나당 한 줄"(예: "- 본인: 회사
// 1,000,000원, 상조회 500,000원")로 풀어서 보여준다 — 칸을 옆으로 나란히 맞추는
// 방식은 긴 텍스트가 있으면 좁은 화면/모바일에서 줄바꿈되면서 정렬이 깨지는데, 이
// 방식은 한 줄이 길어져도 그 줄만 자연스럽게 줄바꿈될 뿐 다른 줄에 영향이 없다.
// 그 외 텍스트(h1~h6, p, br, li)는 굵은 제목/줄바꿈 정도만 살려서 보여준다.

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

// 헤더 텍스트로 그 열이 "라벨"(대상/구분 등)인지 "값"(금액/일수 등)인지, "비고"인지 구분한다.
function _classifyHeader(header) {
  const h = (header || '').trim();
  if (h === '비고') return 'remark';
  if (/\(원\)|일수|기준|금액|%/.test(h)) return 'value';
  return 'label';
}

// <table> 하나를 { headers, roles, rows } 구조로 파싱한다. <thead>/<tbody> 구분과 무관하게
// <th>가 있는 행을 헤더로, 나머지를 데이터 행으로 취급한다.
function parseTable(tableInnerHtml) {
  const headers = [];
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(tableInnerHtml)) !== null) {
    const cells = [];
    let rowHasTh = false;
    const cellRe = /<(t[hd])\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cm;
    while ((cm = cellRe.exec(rm[1])) !== null) {
      if (/^th$/i.test(cm[1])) rowHasTh = true;
      cells.push(_decodeEntities(_stripAllTags(cm[2])).replace(/\s+/g, ' ').trim());
    }
    if (!cells.length) continue;
    if (rowHasTh && !headers.length) {
      cells.forEach(function (c) { headers.push(c); });
    } else {
      rows.push(cells);
    }
  }
  if (!rows.length) return null;
  const colCount = Math.max(headers.length, rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0));
  const roles = [];
  for (let c = 0; c < colCount; c += 1) roles.push(_classifyHeader(headers[c]));
  return { headers: headers, roles: roles, rows: rows };
}

// 값 열 하나(header, cell)를 "회사 1,000,000원"처럼 사람이 읽을 문구로 만든다.
function _formatValueCell(header, cell) {
  const h = (header || '').trim();
  const c = (cell || '').trim();
  if (!c) return null;
  if (/일수/.test(h)) {
    return { label: null, text: /^\d+$/.test(c) ? c + '일' : c };
  }
  if (/\(원\)/.test(h)) {
    const label = h.replace(/\s*\(원\)\s*/, '').trim();
    return { label: label, text: c === '-' ? '-' : c + '원' };
  }
  return { label: h, text: c };
}

// 표의 데이터 행 하나를 { labelText, valueText, remark } (원문, 이스케이프 전)로 분해한다.
// 제도 전체를 보여줄 때(formatRowLine)와 특정 행 하나만 찾아 보여줄 때(policyDetailSearch)
// 둘 다 이 함수를 기반으로 하되 조립 방식만 다르게 한다.
function extractRowParts(table, row) {
  const labelParts = [];
  const valueEntries = [];
  let remark = '';
  for (let c = 0; c < table.roles.length; c += 1) {
    const cell = row[c] || '';
    if (!cell) continue;
    const role = table.roles[c];
    if (role === 'remark') { remark = cell; continue; }
    if (role === 'value') {
      const entry = _formatValueCell(table.headers[c], cell);
      if (entry) valueEntries.push(entry);
    } else {
      labelParts.push(cell);
    }
  }
  const valueText = valueEntries.length
    ? valueEntries.map(function (e) { return e.label ? e.label + ' ' + e.text : e.text; }).join(', ')
    : '';
  return { labelText: labelParts.join(' '), valueText: valueText, remark: remark };
}

// 표의 데이터 행 하나를 "- 라벨: 값1, 값2\n  (비고)" 형태의 한 줄(또는 두 줄)로 만든다.
function formatRowLine(table, row) {
  const parts = extractRowParts(table, row);
  let line = '- ' + _escapeHtml(parts.labelText) + (parts.valueText ? ': ' + _escapeHtml(parts.valueText) : '');
  if (parts.remark) line += '\n    (' + _escapeHtml(parts.remark) + ')';
  return line;
}

function _renderTableAsLines(tableInnerHtml) {
  const table = parseTable(tableInnerHtml);
  if (!table) return '';
  return table.rows.map(function (row) { return formatRowLine(table, row); }).join('\n');
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
    return '\nH' + (headings.length - 1) + '\n';
  });
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '- ');
  s = s.replace(/<\/(p|div|li|tr|section|article)>/gi, '\n');
  s = _stripAllTags(s);
  s = _decodeEntities(s);
  s = _escapeHtml(s);
  s = s.replace(/H(\d+)/g, function (_, idx) {
    return '<b>' + _escapeHtml(headings[Number(idx)]) + '</b>';
  });
  s = s.split('\n').map(function (l) { return l.trim(); }).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function _stripWrapper(html) {
  let rest = String(html || '');
  rest = rest.replace(/<!--[\s\S]*?-->/g, '');
  rest = rest.replace(/<head[\s\S]*?<\/head>/gi, '');
  rest = rest.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  return rest;
}

// content를 순서대로 훑어 [{ heading, table }] 형태로 구조화한다. heading은 그 표
// 바로 앞에 나온 가장 가까운 h1~h6 텍스트(없으면 '')다. 표가 있는 블록만 대상으로
// 하며(제도 상세 검색은 표 기반 항목만 지원), detail 검색(situation+대상 조합)에 쓰인다.
function parsePolicySections(html) {
  const rest = _stripWrapper(html);
  const sections = [];
  let currentHeading = '';
  const headingRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  // heading과 table을 문서 순서대로 함께 훑기 위해, 각각의 위치를 모아 정렬한다.
  const markers = [];
  let hm;
  while ((hm = headingRe.exec(rest)) !== null) {
    markers.push({ type: 'heading', index: hm.index, text: _decodeEntities(_stripAllTags(hm[1])).trim() });
  }
  let tm;
  while ((tm = tableRe.exec(rest)) !== null) {
    markers.push({ type: 'table', index: tm.index, inner: tm[1] });
  }
  markers.sort(function (a, b) { return a.index - b.index; });
  markers.forEach(function (mk) {
    if (mk.type === 'heading') {
      currentHeading = mk.text;
    } else {
      const table = parseTable(mk.inner);
      if (table) sections.push({ heading: currentHeading, table: table });
    }
  });
  return sections;
}

// content 전체를 순서대로 렌더링(표는 줄 단위 목록, 나머지는 굵은 제목/평문)한다.
function _renderBlocks(html) {
  const rest = _stripWrapper(html);
  const blocks = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let lastIndex = 0;
  let m;
  while ((m = tableRe.exec(rest)) !== null) {
    const before = rest.slice(lastIndex, m.index);
    if (before.trim()) blocks.push(_renderText(before));
    const lines = _renderTableAsLines(m[1]);
    if (lines) blocks.push(lines);
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

module.exports = {
  renderPolicyContentHtml: renderPolicyContentHtml,
  parseTable: parseTable,
  parsePolicySections: parsePolicySections,
  formatRowLine: formatRowLine,
  extractRowParts: extractRowParts,
  escapeHtml: _escapeHtml,
};
