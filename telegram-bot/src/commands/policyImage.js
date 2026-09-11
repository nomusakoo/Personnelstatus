const { renderPolicyImageHtml } = require('../render/policyImageHtml');
const { htmlToPngBuffer } = require('../render/screenshot');
const { normalizeForMatch } = require('../util');

// "연도별 인력현황"처럼 연도별 열이 많고 표가 여러 개라 데이터가 방대한 항목은 텍스트/
// 고정폭 표로는 알아보기 어렵다 — 이런 항목만 예외적으로 이미지(PNG, 문서로 전송해
// 텔레그램의 사진 압축을 피함)로 내보낸다. 그 외 모든 제도 조회는 그대로 텍스트/HTML이라
// 이 조건에 안 걸리면 Playwright가 전혀 관여하지 않는다(설치 실패해도 나머지 기능엔 무관).
// 제목이 정확히 어떻게 저장돼 있는지 확신할 수 없어(예: "연도별 인력현황" vs "연도별
// 농우바이오 인력 일반현황"처럼 "인력"과 "현황" 사이에 다른 말이 끼어들 수도 있음)
// 정확 일치 대신 "연도별"/"인력"/"현황"이 (순서·인접 여부와 무관하게) 모두 포함되는지로
// 느슨하게 판단한다.
function isImagePolicy(title) {
  const nt = normalizeForMatch(title);
  return nt.indexOf('연도별') !== -1 && nt.indexOf('인력') !== -1 && nt.indexOf('현황') !== -1;
}

function _toFilename(title) {
  const safe = String(title || '제도').replace(/[^\w가-힣]+/g, '_').replace(/^_+|_+$/g, '');
  return (safe || '제도') + '.png';
}

async function renderPolicyImageReply(item) {
  const html = renderPolicyImageHtml(item);
  const buffer = await htmlToPngBuffer(html);
  return { image: buffer, filename: _toFilename(item.title), caption: '📋 ' + item.title };
}

module.exports = { isImagePolicy: isImagePolicy, renderPolicyImageReply: renderPolicyImageReply };
