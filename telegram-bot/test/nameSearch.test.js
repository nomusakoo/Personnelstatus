const test = require('node:test');
const assert = require('node:assert/strict');
const { trimAndValidateQuery, formatSearchReply, handleNameSearch, fuzzyMatchByName, RESULT_CAP } = require('../src/commands/nameSearch');

test('1글자 쿼리는 무효 처리', function () {
  assert.equal(trimAndValidateQuery('홍'), null);
  assert.equal(trimAndValidateQuery('  '), null);
});

test('2글자 이상은 trim되어 통과', function () {
  assert.equal(trimAndValidateQuery('  홍길동  '), '홍길동');
});

test('매칭 없으면 안내 문구', function () {
  const reply = formatSearchReply('없는사람', [], [], {}, {});
  assert.match(reply, /없는사람.*찾을 수 없습니다/);
});

test('직원 매칭 결과 포맷 - 직급/생년/부서/입사일 포함', function () {
  const employees = [
    { name: '홍길동', grade: '과장급', birth_year: 1990, div_id: 'd1', team_id: 't1', join_date: '2020-03-01', status: 'normal' },
  ];
  const divById = { d1: { name: '경영지원본부' } };
  const teamById = { t1: { name: '인사노무팀' } };
  const reply = formatSearchReply('홍길동', employees, [], divById, teamById);
  assert.match(reply, /홍길동/);
  assert.match(reply, /과장급/);
  assert.match(reply, /1990/);
  assert.match(reply, /경영지원본부 \/ 인사노무팀/);
  assert.match(reply, /2020-03-01/);
  assert.doesNotMatch(reply, /퇴사/);
});

test('퇴사자는 제외하지 않고 (퇴사) 라벨을 붙여 포함', function () {
  const employees = [
    { name: '김철수', grade: '대리급', birth_year: 1992, div_id: 'd1', team_id: 't1', join_date: '2019-01-01', status: 'leave' },
  ];
  const reply = formatSearchReply('김철수', employees, [], { d1: { name: '본부' } }, { t1: { name: '팀' } });
  assert.match(reply, /김철수 \(퇴사\)/);
});

test('임원 매칭은 직책/임기로 구분 표시 (직급/생년 필드 없음)', function () {
  const executives = [{ name: '이대표', title: '대표이사', term_start: '2023-01-01', term_end: '2026-12-31' }];
  const reply = formatSearchReply('이대표', [], executives, {}, {});
  assert.match(reply, /이대표/);
  assert.match(reply, /대표이사/);
  assert.match(reply, /2023-01-01 ~ 2026-12-31/);
});

test('동명이인은 전부 나열', function () {
  const employees = [
    { name: '박민수', grade: '사원급', birth_year: 1995, div_id: 'd1', team_id: 't1', join_date: '2022-01-01', status: 'normal' },
    { name: '박민수', grade: '차장급', birth_year: 1980, div_id: 'd2', team_id: 't2', join_date: '2010-01-01', status: 'normal' },
  ];
  const divById = { d1: { name: 'A본부' }, d2: { name: 'B본부' } };
  const teamById = { t1: { name: 'A팀' }, t2: { name: 'B팀' } };
  const reply = formatSearchReply('박민수', employees, [], divById, teamById);
  assert.match(reply, /A본부 \/ A팀/);
  assert.match(reply, /B본부 \/ B팀/);
});

test(RESULT_CAP + '건 초과 시 안내 문구 추가', function () {
  const employees = [];
  for (let i = 0; i < RESULT_CAP + 3; i++) {
    employees.push({ name: '동명이인' + i, grade: '사원급', div_id: 'd1', team_id: 't1', join_date: '2022-01-01', status: 'normal' });
  }
  const reply = formatSearchReply('동명이인', employees, [], { d1: { name: '본부' } }, { t1: { name: '팀' } });
  assert.match(reply, /그 외 3명 더 있습니다/);
});

test('fuzzyMatchByName: 정확히 일치', function () {
  const items = [{ name: '홍길동' }, { name: '김철수' }];
  assert.deepEqual(fuzzyMatchByName(items, '홍길동'), [{ name: '홍길동' }]);
});

test('fuzzyMatchByName: 부분일치', function () {
  const items = [{ name: '홍길동' }, { name: '김철수' }];
  assert.deepEqual(fuzzyMatchByName(items, '길동'), [{ name: '홍길동' }]);
});

test('fuzzyMatchByName: 부분일치가 없으면 오타를 감안한 유사도로 매칭 (30% 이상)', function () {
  const items = [{ name: '홍길동' }, { name: '김철수' }];
  // '홍길동'과 '홍길둥'은 3글자 중 1글자만 달라 유사도 2/3(약 67%) — 임계값(30%) 이상
  assert.deepEqual(fuzzyMatchByName(items, '홍길둥'), [{ name: '홍길동' }]);
});

test('fuzzyMatchByName: 너무 다르면 매칭되지 않음', function () {
  const items = [{ name: '홍길동' }, { name: '김철수' }];
  assert.deepEqual(fuzzyMatchByName(items, '박영희'), []);
});

test('handleNameSearch: 오케스트레이션 - 목업 repository로 검증', async function () {
  const mockRepository = {
    getOrgSnapshot: async function () {
      return {
        divisions: [{ id: 'd1', name: '본부' }],
        teams: [{ id: 't1', name: '팀' }],
        employees: [{ name: '홍길동', grade: '과장급', birth_year: 1990, div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' }],
      };
    },
    getAllExecutives: async function () { return []; },
  };
  const reply = await handleNameSearch({}, mockRepository, '홍길동');
  assert.match(reply, /홍길동/);
  assert.match(reply, /본부 \/ 팀/);
});

test('handleNameSearch: 오타가 있어도 오케스트레이션 단계에서 매칭', async function () {
  const mockRepository = {
    getOrgSnapshot: async function () {
      return {
        divisions: [{ id: 'd1', name: '본부' }],
        teams: [{ id: 't1', name: '팀' }],
        employees: [{ name: '홍길동', grade: '과장급', birth_year: 1990, div_id: 'd1', team_id: 't1', join_date: '2020-01-01', status: 'normal' }],
      };
    },
    getAllExecutives: async function () { return []; },
  };
  const reply = await handleNameSearch({}, mockRepository, '홍길둥');
  assert.match(reply, /홍길동/);
});

test('handleNameSearch: 짧은 쿼리는 DB 호출 없이 안내', async function () {
  let called = false;
  const mockRepository = {
    getOrgSnapshot: async function () { called = true; return { divisions: [], teams: [], employees: [] }; },
    getAllExecutives: async function () { called = true; return []; },
  };
  const reply = await handleNameSearch({}, mockRepository, '홍');
  assert.equal(called, false);
  assert.match(reply, /2글자 이상/);
});
