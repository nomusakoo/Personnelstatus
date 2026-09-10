// 웹앱(index.html)의 GRADES 배열과 동일한 순서 — 조직도 렌더링 시 직급 정렬 기준
const GRADES = [
  '상무보이상', '수석급', '부장급', '차장급', '과장급', '대리급',
  '주임급', '사원급', '기능감급', '책임기사급', '선임기사급', '기사급',
  '영양보조', '기타',
];

// 웹앱의 WORKPLACES/EMP_TYPES 배열과 동일 — 대시보드 사업장별/근무직유형별 집계 기준
const WORKPLACES = ['본사', '지점', '여주', '밀양', '김제', '정읍', '의성', '해외', '지주파견'];
const EMP_TYPES = ['정규직', '임원계약직', '계약직', '촉탁직', '인턴'];

// 여러 본부(division)를 묶는 "부문" 그룹. divisions/teams 테이블 어디에도 이 상위
// 그룹을 저장하는 컬럼이 없어(팀의 center_name은 한 본부 안에서 팀을 묶는 것이라
// 별개의 개념) 코드에 고정 목록으로 둔다. 그룹 구성이 바뀌면 이 배열을 함께 수정해야 한다.
const DIVISION_GROUPS = [
  { name: 'SM부문', divisionNames: ['국내사업본부', '자재사업본부', '마케팅본부', '해외사업본부'] },
  { name: 'SC부문', divisionNames: ['생산관리본부', 'QA본부'] },
];

module.exports = {
  GRADES: GRADES,
  WORKPLACES: WORKPLACES,
  EMP_TYPES: EMP_TYPES,
  DIVISION_GROUPS: DIVISION_GROUPS,
};
