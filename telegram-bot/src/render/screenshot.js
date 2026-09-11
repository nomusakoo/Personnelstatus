// HTML 문자열을 PNG 이미지(Buffer)로 변환한다. 텍스트로는 너무 방대해서 읽기 어려운
// 표(예: 연도별 인력현황)를 이미지로 내보낼 때만 쓰인다 — 그 외 모든 조회는 여전히
// 순수 텍스트라 이 모듈이 없어도(playwright 설치 실패 등) 나머지 기능엔 영향이 없다.
// Chromium 인스턴스는 최초 1회만 띄워 재사용한다(요청마다 새로 띄우면 느리고 비용이 큼).
let browserPromise = null;

function _getBrowser() {
  if (!browserPromise) {
    const { chromium } = require('playwright');
    browserPromise = chromium.launch();
  }
  return browserPromise;
}

// options.width: 뷰포트 너비(px). options.scale: 해상도 배율(높을수록 텍스트가 선명함,
// 대신 파일 용량이 커짐) — 2배(레티나 수준)를 기본값으로 써서 확대해도 흐려지지 않게 한다.
async function htmlToPngBuffer(html, options) {
  const opts = options || {};
  const browser = await _getBrowser();
  const page = await browser.newPage({
    viewport: { width: opts.width || 1200, height: 800 },
    deviceScaleFactor: opts.scale || 2,
  });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await page.screenshot({ type: 'png', fullPage: true });
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
  }
}

module.exports = { htmlToPngBuffer: htmlToPngBuffer, closeBrowser: closeBrowser };
