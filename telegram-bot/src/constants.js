// 웹앱(index.html)의 GRADES 배열과 동일한 순서 — 조직도 렌더링 시 직급 정렬 기준
const GRADES = [
  '상무보이상', '수석급', '부장급', '차장급', '과장급', '대리급',
  '주임급', '사원급', '기능감급', '책임기사급', '선임기사급', '기사급',
  '영양보조', '기타',
];

// 웹앱의 WORKPLACES/EMP_TYPES 배열과 동일 — 대시보드 사업장별/근무직유형별 집계 기준
const WORKPLACES = ['본사', '지점', '여주', '밀양', '김제', '정읍', '의성', '해외', '지주파견'];
const EMP_TYPES = ['정규직', '임원계약직', '계약직', '촉탁직', '인턴'];

module.exports = { GRADES: GRADES, WORKPLACES: WORKPLACES, EMP_TYPES: EMP_TYPES };
