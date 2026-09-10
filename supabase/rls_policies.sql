-- ============================================================================
-- 인원현황 웹앱(index.html) — Supabase Row Level Security(RLS) 점검/적용 스크립트
-- ============================================================================
--
-- 왜 필요한가:
-- 웹앱은 브라우저에서 Supabase "anon" key로 접속합니다(service_role 아님).
-- anon key는 페이지 소스/네트워크 탭에서 누구나 확인할 수 있는 값이라, "비밀"이
-- 아닙니다. 지금 웹앱은 이메일/비번 + TOTP MFA 로그인 화면을 두고 있지만, 만약
-- 아래 테이블들에 RLS가 꺼져 있거나 정책이 없다면, 로그인 화면을 거치지 않고도
-- 이 anon key + 프로젝트 URL만으로 Supabase REST API를 직접 호출해 전체 인원
-- 데이터를 읽거나(심하면 수정/삭제까지) 할 수 있습니다. 로그인 화면은 "웹페이지"의
-- 문일 뿐, 데이터베이스 자체의 문이 잠겨 있는지는 별개 문제입니다.
--
-- 먼저 확인할 것 (Supabase 대시보드 → Table Editor):
-- 아래 각 테이블을 열어 우측 상단 "RLS enabled" 상태를 확인하세요.
-- 꺼져 있으면(비활성) 지금 바로 켜야 합니다. 정책 없이 RLS만 켜면 기본적으로
-- 전부 차단되므로, 이 스크립트로 "로그인한 사용자만 허용" 정책을 함께 넣어줍니다.
--
-- 적용 방법: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣고 실행.
-- (이 저장소에는 자동 마이그레이션 파이프라인이 없습니다 — 직접 실행해야 반영됩니다.)
--
-- 정책 방향: 이 앱은 행 단위(row-level) 소유자 개념이 없는 내부 인사관리 도구이고,
-- 계정은 본인이 직접 생성한 것만 존재합니다(가입 화면 없음, Authentication에서
-- 직접 초대/생성). 따라서 "로그인(인증)된 사용자면 전부 허용, 비로그인은 전부
-- 차단"이 현재 웹앱의 실제 동작과 일치하는 가장 단순하고 안전한 정책입니다.
--
-- 주의: 화면에서 여러 테이블을 조합해 검증하더라도, RLS 정책은 "이 테이블에 대한
-- 이 쿼리"만 보고 판단하므로 각 테이블에 개별적으로 걸어야 합니다. 목록에 없는
-- 테이블이 있다면(예: 이 문서 작성 이후 새로 추가한 테이블) 같은 패턴으로 추가하세요.
-- ============================================================================

-- 대상 테이블: index.html이 실제로 .from()으로 접근하는 테이블 전체
-- (divisions, teams, employees, executives, exec_events, dispatch_employees, snapshots)

alter table public.divisions enable row level security;
alter table public.teams enable row level security;
alter table public.employees enable row level security;
alter table public.executives enable row level security;
alter table public.exec_events enable row level security;
alter table public.dispatch_employees enable row level security;
alter table public.snapshots enable row level security;

-- 기존에 이름이 겹치는 정책이 있으면 먼저 지우고 새로 만듭니다(재실행 안전).
drop policy if exists "authenticated only" on public.divisions;
drop policy if exists "authenticated only" on public.teams;
drop policy if exists "authenticated only" on public.employees;
drop policy if exists "authenticated only" on public.executives;
drop policy if exists "authenticated only" on public.exec_events;
drop policy if exists "authenticated only" on public.dispatch_employees;
drop policy if exists "authenticated only" on public.snapshots;

create policy "authenticated only" on public.divisions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated only" on public.teams
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated only" on public.employees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated only" on public.executives
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated only" on public.exec_events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated only" on public.dispatch_employees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated only" on public.snapshots
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================================
-- 참고: hr_exec_events 테이블은 "외부 연동" 별도 Supabase 프로젝트에 있습니다
-- (SUPABASE2_URL). 이 저장소가 그 프로젝트를 직접 관리하지 않는다면 위 목록에
-- 포함하지 않았습니다 — 그 프로젝트도 본인이 관리한다면 같은 패턴으로 별도 적용하세요.
--
-- 참고: 텔레그램봇(telegram-bot/)은 service_role 키를 쓰므로 RLS의 영향을 받지
-- 않습니다(의도된 설계 — 봇 자체의 화이트리스트가 접근 통제 역할). 이 스크립트는
-- 웹앱이 쓰는 anon key 쪽 구멍을 막기 위한 것입니다.
-- ============================================================================
