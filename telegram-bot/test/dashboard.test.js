const test = require('node:test');
const assert = require('node:assert/strict');
const { matchDashboardTopic, formatDashboardText, getDashboardText } = require('../src/commands/dashboard');

test('matchDashboardTopic: 정확한 키워드는 바로 매칭', function () {
  assert.deepEqual(matchDashboardTopic('총인원'), { key: 'total', title: '총인원' });
  assert.deepEqual(matchDashboardTopic('휴직'), { key: 'leaveAbs', title: '휴직' });
});

test('matchDashboardTopic: 공백이 섞여도 매칭', function () {
  assert.deepEqual(matchDashboardTopic('직급 별 인원'), { key: 'byGrade', title: '직급별 인원' });
  assert.deepEqual(matchDashboardTopic('  본부  별  '), { key: 'byDivision', title: '본부별 인원' });
});

test('matchDashboardTopic: 일부 단어만 입력해도 매칭', function () {
  assert.deepEqual(matchDashboardTopic('사업장'), { key: 'byWorkplace', title: '사업장별 인원' });
  assert.deepEqual(matchDashboardTopic('파견자'), { key: 'dispatch', title: '파견' });
});

test('matchDashboardTopic: 오타(편집거리 1)도 허용', function () {
  assert.deepEqual(matchDashboardTopic('퇴사쟈'), { key: 'leave', title: '이번달 퇴사' });
  assert.deepEqual(matchDashboardTopic('총인웜'), { key: 'total', title: '총인원' });
});

test('matchDashboardTopic: 대시보드 키워드가 아니면 null (이름/조직명 검색으로 폴백)', function () {
  assert.equal(matchDashboardTopic('홍길동'), null);
  assert.equal(matchDashboardTopic(''), null);
});

test('formatDashboardText: total은 이름 중복 제거 + 대표이사/전무이사 포함', function () {
  const employees = [
    { name: '홍길동', status: 'normal' },
    { name: '김철수', status: 'normal' },
    { name: '퇴사자', status: 'leave' },
  ];
  const executives = [
    { name: '이대표', title: '대표이사' },
    { name: '김철수', title: '전무이사' }, // 이미 직원으로 등록되어 있으므로 중복 카운트 안 함
  ];
  const text = formatDashboardText('total', employees, [], executives);
  assert.match(text, /총인원: 3명/); // 홍길동, 김철수, 이대표
});

test('formatDashboardText: 상태별 카운트(입사/퇴사/인사이동/휴직/파견)', function () {
  const employees = [
    { status: 'join' }, { status: 'join' },
    { status: 'leave' },
    { status: 'transfer' },
    { status: 'leave_abs' },
    { status: 'dispatch' }, { status: 'dispatch' }, { status: 'dispatch' },
  ];
  assert.match(formatDashboardText('join', employees), /이번달 입사: 2명/);
  assert.match(formatDashboardText('leave', employees), /이번달 퇴사: 1명/);
  assert.match(formatDashboardText('transfer', employees), /인사이동: 1명/);
  assert.match(formatDashboardText('leaveAbs', employees), /휴직: 1명/);
  assert.match(formatDashboardText('dispatch', employees), /파견: 3명/);
});

test('formatDashboardText: 직급별/직책별/본부별/사업장별/근무직유형별 인원 집계', function () {
  const divisions = [{ id: 'd1', name: '경영지원본부' }, { id: 'd2', name: '해외사업본부' }];
  const employees = [
    { grade: '과장급', position: '팀장', div_id: 'd1', workplace: '본사', emp_type: '정규직', status: 'normal' },
    { grade: '과장급', position: '', div_id: 'd1', workplace: '여주', emp_type: '계약직', status: 'normal' },
    { grade: '대리급', position: '팀장', div_id: 'd2', workplace: '', emp_type: '정규직', status: 'normal' },
    { grade: '대리급', position: '', div_id: 'd2', workplace: '', emp_type: '', status: 'leave' }, // 퇴사자는 제외
  ];
  const gradeText = formatDashboardText('byGrade', employees);
  assert.match(gradeText, /과장급: 2명/);
  assert.match(gradeText, /대리급: 1명/);
  assert.match(gradeText, /총 3명/);

  const posText = formatDashboardText('byPosition', employees);
  assert.match(posText, /팀장: 2명/);
  assert.match(posText, /총 2명/); // 빈 직책은 집계에서 제외

  const divText = formatDashboardText('byDivision', employees, divisions);
  assert.match(divText, /경영지원본부: 2명/);
  assert.match(divText, /해외사업본부: 1명/);

  const wpText = formatDashboardText('byWorkplace', employees);
  assert.match(wpText, /본사: 1명/);
  assert.match(wpText, /여주: 1명/);
  assert.match(wpText, /미입력: 1명/);

  const etText = formatDashboardText('byEmpType', employees);
  assert.match(etText, /정규직: 2명/);
  assert.match(etText, /계약직: 1명/);
});

function makeMockSb(dataByTable) {
  return {
    from: function (table) {
      const builder = {
        select: function () { return builder; },
        order: function () { return builder; },
        then: function (resolve) { return resolve({ data: dataByTable[table] || [], error: null }); },
      };
      return builder;
    },
  };
}

test('getDashboardText: 대시보드 키워드면 통계 텍스트 반환', async function () {
  const sb = makeMockSb({
    divisions: [],
    teams: [],
    employees: [{ name: '홍길동', status: 'join' }],
    executives: [],
  });
  const text = await getDashboardText(sb, '입사자');
  assert.match(text, /이번달 입사: 1명/);
});

test('getDashboardText: 대시보드 키워드가 아니면 null 반환 (폴백 신호)', async function () {
  const sb = makeMockSb({ divisions: [], teams: [], employees: [], executives: [] });
  const text = await getDashboardText(sb, '홍길동');
  assert.equal(text, null);
});
