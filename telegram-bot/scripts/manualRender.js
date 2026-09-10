// npm test 대상이 아님 — 목업 데이터로 실제 PNG를 생성해 눈으로 확인하는 개발용 스크립트.
// 사용법: node test/manualRender.js
const fs = require('fs');
const path = require('path');
const { renderOrgChartHtml } = require('../src/render/orgChartTemplate');
const { renderExecCalendarHtml } = require('../src/render/execCalendarTemplate');
const { htmlToPngBuffer, closeBrowser } = require('../src/render/screenshot');

const OUT_DIR = path.join(__dirname, 'output');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const divisions = [
    { id: 'd1', name: '경영지원본부', sort_order: 0 },
    { id: 'd2', name: '해외사업본부', sort_order: 1 },
  ];
  const teams = [
    { id: 't1', div_id: 'd1', name: '인사노무팀', sort_order: 0 },
    { id: 't2', div_id: 'd1', name: 'IT관리팀', sort_order: 1 },
    { id: 't3', div_id: 'd2', name: '해외영업1팀', sort_order: 0 },
  ];
  const employees = [
    { name: '홍길동', grade: '과장급', div_id: 'd1', team_id: 't1', join_date: '2019-03-01', status: 'normal' },
    { name: '김철수', grade: '대리급', div_id: 'd1', team_id: 't1', join_date: '2022-07-15', status: 'normal' },
    { name: '이영희', grade: '차장급', div_id: 'd1', team_id: 't2', join_date: '2012-01-10', status: 'normal' },
    { name: '박민수', grade: '사원급', div_id: 'd2', team_id: 't3', join_date: '2024-01-02', status: 'normal' },
    { name: '퇴사자', grade: '사원급', div_id: 'd2', team_id: 't3', join_date: '2020-01-01', status: 'leave' },
  ];

  const orgHtml = renderOrgChartHtml(divisions, teams, employees, new Date('2026-09-10'));
  const orgPng = await htmlToPngBuffer(orgHtml);
  fs.writeFileSync(path.join(OUT_DIR, 'orgchart-sample.png'), orgPng);
  console.log('조직도 샘플 저장:', path.join(OUT_DIR, 'orgchart-sample.png'));

  const events = [
    { date: '2026-09-05', time: '10:00', title: '이사회', description: '', deadline: false },
    { date: '2026-09-05', time: '14:00', title: '임원 간담회 - 하반기 사업계획 보고', description: '회의실 A', deadline: true },
    { date: '2026-09-20', time: '', title: '해외 바이어 미팅', description: '', deadline: false },
  ];
  const calHtml = renderExecCalendarHtml(2026, 9, events);
  const calPng = await htmlToPngBuffer(calHtml);
  fs.writeFileSync(path.join(OUT_DIR, 'exec-calendar-sample.png'), calPng);
  console.log('임원일정 샘플 저장:', path.join(OUT_DIR, 'exec-calendar-sample.png'));

  await closeBrowser();
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
