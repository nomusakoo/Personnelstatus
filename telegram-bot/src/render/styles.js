// 두 템플릿(조직도/임원일정)이 공유하는 기본 스타일.
// 폰트는 macOS/Linux 어디서든 한글이 깨지지 않도록 흔한 산세리프 계열을 넉넉히 나열한다.
const BASE_STYLE = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;
    background:#f5f7fa;color:#222;padding:20px 24px;
  }
  h1{font-size:20px;color:#1e3a5f;margin-bottom:4px;}
  .sub{font-size:12px;color:#888;margin-bottom:16px;}
  .empty{padding:60px 0;text-align:center;color:#aaa;font-size:15px;}
`;

module.exports = { BASE_STYLE: BASE_STYLE };
