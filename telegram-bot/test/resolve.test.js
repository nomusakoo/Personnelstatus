const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveTextQuery } = require('../src/commands/resolve');

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

test('resolveTextQuery: 짧은 쿼리는 DB 호출 없이 안내', async function () {
  const sb = makeMockSb({});
  const reply = await resolveTextQuery(sb, '홍');
  assert.match(reply, /2글자 이상/);
});

test('resolveTextQuery: 이름이 정확히 일치하면 조직명 오타 매칭보다 우선함', async function () {
  // '박상팀'이라는 팀이 있고 '박상민'과 유사도가 높아(약 67%) 조직명 검색이 먼저 실행되면
  // 팀 정보가 잘못 나올 수 있다 — 이름이 정확히 일치하면 그쪽을 최우선으로 보여줘야 한다.
  const sb = makeMockSb({
    divisions: [{ id: 'd1', name: '본부' }],
    teams: [{ id: 't1', div_id: 'd1', name: '박상팀', center_name: '' }],
    employees: [
      { name: '박상민', grade: '과장급', birth_year: 1990, div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' },
    ],
    executives: [],
  });
  const reply = await resolveTextQuery(sb, '박상민');
  assert.match(reply, /박상민/);
  assert.match(reply, /직원/);
  assert.doesNotMatch(reply, /조직도/);
});

test('resolveTextQuery: "총원"/"총인원"은 우연히 비슷한 팀 이름(예: "총무팀")보다 대시보드 총인원이 우선함', async function () {
  // 실제로 발생했던 문제: "총무팀"은 "총원"/"총인원"과 유사도가 30%를 넘어(레벤슈타인
  // 기준) 조직명 검색(findOrgScope)의 유사도 매칭에 걸려버린다. 정확히 등록된 대시보드
  // 키워드는 조직명 검색보다 먼저 확인해야 이런 오검색을 막을 수 있다.
  const sb = makeMockSb({
    divisions: [{ id: 'd1', name: '본부' }],
    teams: [{ id: 't1', div_id: 'd1', name: '총무팀', center_name: '' }],
    employees: [
      { name: '홍길동', status: 'normal' },
      { name: '김철수', status: 'normal' },
    ],
    executives: [],
  });
  const reply1 = await resolveTextQuery(sb, '총원');
  assert.match(reply1, /현재 총 인원: 2명/);
  assert.doesNotMatch(reply1, /조직도/);

  const reply2 = await resolveTextQuery(sb, '총인원');
  assert.match(reply2, /현재 총 인원: 2명/);
  assert.doesNotMatch(reply2, /조직도/);
});

test('resolveTextQuery: 직급/직책이면 해당하는 사람 전체 명단을 반환', async function () {
  const sb = makeMockSb({
    divisions: [{ id: 'd1', name: '경영지원본부' }],
    teams: [{ id: 't1', div_id: 'd1', name: '인사노무팀', center_name: '' }],
    employees: [
      { name: '홍길동', grade: '과장급', position: '팀장', div_id: 'd1', team_id: 't1', status: 'normal' },
      { name: '김철수', grade: '과장급', position: '', div_id: 'd1', team_id: 't1', status: 'normal' },
    ],
    executives: [{ name: '박사외', title: '사외이사' }],
  });
  const gradeReply = await resolveTextQuery(sb, '과장급');
  assert.match(gradeReply, /'과장급' 검색 결과 \(총 2명\)/);
  assert.match(gradeReply, /홍길동/);
  assert.match(gradeReply, /김철수/);

  const execReply = await resolveTextQuery(sb, '사외이사');
  assert.match(execReply, /박사외/);
});

test('resolveTextQuery: 조직명(본부)이면 그 범위의 조직도 텍스트를 반환', async function () {
  const sb = makeMockSb({
    divisions: [{ id: 'd1', name: '경영지원본부' }],
    teams: [{ id: 't1', div_id: 'd1', name: '인사노무팀', center_name: '' }],
    employees: [{ name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' }],
    executives: [],
  });
  const reply = await resolveTextQuery(sb, '경영지원본부');
  assert.match(reply, /조직도 - 경영지원본부/);
  assert.match(reply, /홍길동/);
});

test('resolveTextQuery: 대시보드 키워드면 통계 텍스트를 반환', async function () {
  const sb = makeMockSb({
    divisions: [],
    teams: [],
    employees: [{ name: '홍길동', status: 'join' }],
    executives: [],
  });
  const reply = await resolveTextQuery(sb, '입사자');
  assert.match(reply, /이번달 입사: 1명/);
});

test('resolveTextQuery: 조직명/대시보드 키워드가 아니면 이름 부분일치·유사도 검색으로 폴백', async function () {
  const sb = makeMockSb({
    divisions: [{ id: 'd1', name: '본부' }],
    teams: [{ id: 't1', div_id: 'd1', name: '팀' }],
    employees: [{ name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' }],
    executives: [],
  });
  const reply = await resolveTextQuery(sb, '길동');
  assert.match(reply, /홍길동/);
});

test('resolveTextQuery: 아무 것도 매칭되지 않으면 안내 문구', async function () {
  const sb = makeMockSb({ divisions: [], teams: [], employees: [], executives: [] });
  const reply = await resolveTextQuery(sb, '없는사람');
  assert.match(reply, /찾을 수 없습니다/);
});

test('resolveTextQuery: sb2가 있으면 제도(hr_policies) 항목명으로 상세 내용을 반환', async function () {
  const sb = makeMockSb({ divisions: [], teams: [], employees: [], executives: [] });
  const sb2 = makeMockSb({
    hr_policies: [
      { id: 7, category: '복리후생', title: '경조휴가', content: '<p>경조휴가 안내 내용</p>', sort_order: 1 },
    ],
  });
  const reply = await resolveTextQuery(sb, '경조휴가', sb2);
  assert.match(reply, /📋 경조휴가/);
  assert.match(reply, /경조휴가 안내 내용/);
});

test('resolveTextQuery: sb2를 안 넘겨도(외부 연동 미설정) 에러 없이 이름 검색으로 폴백', async function () {
  const sb = makeMockSb({ divisions: [], teams: [], employees: [], executives: [] });
  const reply = await resolveTextQuery(sb, '경조휴가'); // sb2 생략
  assert.match(reply, /찾을 수 없습니다/);
});
