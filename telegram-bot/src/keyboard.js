const { Keyboard } = require('grammy');
const { TOPICS } = require('./commands/dashboard');

// 자주 쓰는 메뉴를 채팅창 하단에 고정 버튼으로 노출. resized()로 버튼 크기를 줄이고,
// persistent()로 다른 메시지를 보내도 계속 떠 있게 한다.
const mainKeyboard = new Keyboard()
  .text('조직도').text('임원일정')
  .row()
  .text('도움말')
  .resized()
  .persistent();

// policies는 선택 인자 — 외부 연동(SUPABASE2_*)이 설정돼 있으면 index.js가
// repository.getHrPolicies(sb2)로 실제 hr_policies 목록을 가져와 넘겨준다. 그래야
// 실제 시트에 있는 항목명 그대로(카테고리별로) 안내할 수 있다. 안 넘기거나 빈
// 배열이면 그 섹션은 생략한다(순수 포맷팅 함수 — DB 호출은 호출부 책임).
function buildHelpText(policies) {
  const topicTitles = TOPICS.map(function (t) { return t.title; }).join(', ');

  const sections = [
    '📋 사용 방법',
    '',
    '▪ 이름 검색',
    '  이름을 입력 (예: 홍길동) → 직급/생년/부서/입사일',
    '',
    '▪ 직급/직책 검색',
    '  직급 또는 직책을 입력 (예: 과장급, 팀장, 본부장, 사외이사) → 해당하는 사람 전체 명단',
    '',
    '▪ 출생연도 검색',
    "  출생연도를 입력 (예: 70, 70년생, 1970년생) → 그 해에 태어난 재직자 명단",
    '',
    '▪ 조직 검색',
    '  본부/부문/팀 이름을 입력 (예: 경영지원본부, SM부문, 인사노무팀) → 그 조직 구성원만',
    "  '조직도' → 전체 조직도",
    '',
    '▪ 임원일정',
    "  '임원일정' 또는 '임원일정 10월' → 이번 달/지정한 달 임원 일정",
    '',
    '▪ 대시보드 통계',
    '  아래 키워드를 입력 (일부 단어만 입력하거나 띄어쓰기가 달라도 인식됩니다):',
    '  ' + topicTitles,
  ];

  if (policies && policies.length) {
    const byCategory = {};
    const categoryOrder = [];
    policies.forEach(function (p) {
      const cat = p.category || '기타';
      if (!byCategory[cat]) { byCategory[cat] = []; categoryOrder.push(cat); }
      byCategory[cat].push(p.title);
    });
    sections.push('', '▪ 제도 조회', '  제도 항목명을 입력 → 상세 내용');
    categoryOrder.forEach(function (cat) {
      sections.push('  [' + cat + '] ' + byCategory[cat].join(', '));
    });
  }

  sections.push('', '▪ 기타', "  '도움말' 또는 '/start' → 이 안내를 다시 보여줌");

  return sections.join('\n');
}

module.exports = { mainKeyboard: mainKeyboard, buildHelpText: buildHelpText };
