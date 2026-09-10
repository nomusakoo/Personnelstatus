const { chromium } = require('playwright');

// 크로미움 인스턴스를 최초 1회만 launch해서 재사용한다 (요청마다 재실행하지 않음).
// PLAYWRIGHT_CHROMIUM_PATH를 지정하면 그 경로의 실행파일을 쓴다 — 일반적인 운영
// 환경(맥미니, `npx playwright install chromium` 완료)에서는 비워두면 되고,
// 특수한 샌드박스 환경에서 미리 설치된 브라우저를 가리킬 때만 사용한다.
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    const launchOpts = { headless: true };
    if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
      launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
    }
    browserPromise = chromium.launch(launchOpts);
  }
  return browserPromise;
}

// html 문자열을 스크린샷해 PNG Buffer로 반환한다. 디스크에는 아무것도 쓰지 않는다.
async function htmlToPngBuffer(html, opts) {
  opts = opts || {};
  const width = opts.width || 900;
  const browser = await getBrowser();
  // deviceScaleFactor:2 — 문서(document)로 전송해도 원본 해상도가 낮으면 폰에서
  // 확대해 볼 때 흐려 보이므로, 2배 밀도로 렌더링해 텍스트를 더 선명하게 함
  const page = await browser.newPage({
    viewport: { width: width, height: opts.height || 800 },
    deviceScaleFactor: 2,
  });
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const bodyHeight = await page.evaluate(function () { return document.body.scrollHeight; });
    await page.setViewportSize({ width: width, height: Math.min(bodyHeight + 20, 8000) });
    return await page.screenshot({ type: 'png', fullPage: true });
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = { htmlToPngBuffer: htmlToPngBuffer, closeBrowser: closeBrowser };
