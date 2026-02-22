# ReportMate — 진행 상황 요약

> **새 Cursor Agent / 새 채팅에서** 이 문서만 읽으면 프로젝트와 지금까지의 작업 맥락을 파악할 수 있도록 정리한 문서입니다.

---

## 1. 프로젝트 개요

- **이름**: ReportMate (RM)
- **목적**: 초등 1학년 1학기 **국어/수학** 생활기록부 평어 자동 생성 **웹앱** (엑셀 대체용)
- **성격**: 단일 반 도구. **SaaS 아님.** 로그인·프로젝트·멀티테넌트 없음.
- **스택**: Next.js 15 (App Router) + TypeScript, Supabase (Postgres), Zustand, **Auth.js v5 / next-auth@5 (Google OAuth)**.
- **배포**: Cloudflare Workers (OpenNext). **접속 URL**: https://report-mate.org (www.report-mate.org 동일). workers.dev 비활성화.
- **인증**: 비로그인도 학급→등급→평어 생성까지 **체험 가능**(저장 안 됨). 로그인 시 본인 학급만 저장·조회.

**핵심 제약**

- **기본 평어**: DB `templates` 테이블에서만 문장 선택. **Math.random() 금지.** `src/lib/generator.ts`는 deterministic.
- **선택적 GPT**: 해당 학급·학기·과목에 **활동 메모(activities)**가 있으면 OpenAI GPT-4o-mini로 문장 재작성 (`/api/generate-comment`). 없으면 템플릿 문장 그대로 사용.

---

## 2. 사용자 사용 흐름 (UX)

**앱 접속 시**

- **비로그인**: 메인(/)에서 **랜딩** — "ReportMate는 초등 선생님을 위한 평어 생성 서비스입니다", **회원가입** 버튼(클릭 시 `signIn('google', { callbackUrl: '/auth/popup-done' })` → Google OAuth → 완료 시 `/auth/popup-done` → `/classes` 이동), **로그인 없이 체험하기** 링크. 체험 시 학급·등급·평어 모두 가능하나 **저장되지 않음**(메모리·게스트 스토어만).
- **로그인**: 메인(/)에서 학급 목록·등록 안내(기존과 동일). 학급·학생·등급·활동은 **본인(user_id)만** 저장·조회.

**학급 중심 흐름 (유일한 흐름)**

1. **앱 접속** → (로그인 시) 메인에서 학급 목록·등록 안내
2. **학급 목록** (`/classes`) → 학급 등록(예: 1학년 1반) 또는 기존 학급 선택
3. **학급 상세** (`/classes/[id]`) → **1학기/2학기** 선택 → **과목** 선택 (국어 / 수학 / 통합→바생·슬생·즐생)
4. **단원 선택** (`/classes/[id]/units?sem=&subject=`) → 해당 과목·학기 **전체 단원** 체크박스, 원하는 단원만 선택 (최소 1개). 선택 정보는 **세션(store)만** 유지.
5. **레벨 단계 선택** (`/classes/[id]/level-step?sem=&subject=`) → **2단계**(잘함/노력요함), **3단계**(잘함/보통/노력요함), **4단계**(매우잘함/잘함/보통/노력요함) 중 선택. 선택 정보는 **세션(store)만** 유지.
6. **등급 입력** (`/classes/[id]/ratings?sem=&subject=`) → **선택된 단원만** 열로 표시, 선택한 레벨 단계에 맞는 등급 select. 이번 학기 학습 활동 입력(선택). 자동 저장 후 **평어 생성** 링크로 이동.
7. **평어 생성** (`/review`) → **선택된 단원만** 기준으로 학생별 평어 표시. 활동이 있으면 GPT 반영 재작성, 로딩 후 표시. 수정·복사.

**레벨 단계 매핑 (DB는 1~4 유지)**

- DB `templates`/`ratings`의 `level`은 항상 `'1'|'2'|'3'|'4'`.
- 2단계 선택 시: 잘함 → DB 2, 노력요함 → DB 4 (표시 시 1,2,3 → 잘함).
- 3단계: 잘함→2, 보통→3, 노력요함→4 (표시 시 1,2→잘함).
- 4단계: 매우잘함→1, 잘함→2, 보통→3, 노력요함→4.

**기존 `/students`, `/ratings` 페이지**는 `/classes`로 리다이렉트됨. `/review`는 학급 컨텍스트 없이 접근 시 "학급을 먼저 선택하세요" 안내.

---

## 3. 현재 구현 상태 (MVP 기준)

| 구분 | 상태 | 비고 |
|------|------|------|
| 인증 | ✅ | **Auth.js v5 (next-auth@5)**, Google OAuth. `signIn('google')` (POST 방식). API `[...nextauth]` handlers export. Web Fetch API 사용 → Cloudflare Workers 호환. |
| 데이터 격리 | ✅ | `classrooms.user_id`, Server Actions로 목록/생성/소유 확인. 타 사용자 학급 미노출 |
| 비로그인 체험 | ✅ | 게스트 스토어(Zustand). 학급·학생·등급·활동 메모리만, DB 미저장. ID 접두사 `guest-` |
| 라우팅 | ✅ | `/`, `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/students`, `/classes/[id]/units`, `/classes/[id]/level-step`, `/classes/[id]/ratings`, `/review`. `/students`, `/ratings`는 `/classes`로 리다이렉트. |
| 학급·학기·과목 | ✅ | 학급 등록, 1·2학기, 국어/수학/통합(바생·슬생·즐생) 선택 후 **단원 선택**으로 진입 |
| 단원 선택 | ✅ | 해당 과목·학기 전체 단원 체크박스, 최소 1개, 세션만 저장 |
| 레벨 단계 | ✅ | 2/3/4단계 선택, 세션만 저장. 등급 입력·평어 생성 시 프론트에서 DB 1~4와 매핑 |
| DB 스키마 | ✅ | classrooms, activities, areas(semester), templates, students(classroom_id), ratings. level 1~4. |
| 등급 체계 | ✅ | **매우잘함(1) / 잘함(2) / 보통(3) / 노력요함(4)**. UI에서 2/3/4단계로 축약 표시 가능. |
| 템플릿 시드 | ✅ | **국어·수학** 1학년 1학기: `seed-국어수학-평어.mjs` + seed-data JSON 4개. 국어·수학 종합 제거됨. |
| /review | ✅ | **선택된 단원만** 기준 평어. 학급·학기·과목·activities 조회. 활동 있으면 GPT 재작성, 로딩·수정·복사. 학급 없이 접근 시 안내 메시지. |
| 에러/환경 | ✅ | hasSupabaseEnv, .env.local 안내. |
| UI/디자인 | ✅ | 따뜻한 색상(살구/테라코타), 아이보리 배경, rounded corners. 모바일 반응형. PWA 아이콘(manifest 크기 일치). 네비: 홈, 학급 목록, 로그인/로그아웃. |
| 배포 | ✅ | Cloudflare Workers (OpenNext). report-mate.org 커스텀 도메인. `npm run deploy:cf`. vars+secrets, nodejs_compat_populate_process_env |
| 엑셀 다운로드 | ❌ | 미구현 |
| 통합(바생·슬생·즐생) templates 시드 | ❌ | 필요 시 추가 |

---

## 4. 라우팅·파일 위치

```
next-app/
├── src/app/
│   ├── page.tsx                         # 메인: 비로그인=랜딩(소개+회원가입), 로그인=학급 안내
│   ├── api/auth/[...nextauth]/route.ts  # NextAuth API (GET/POST). 단순 핸들러.
│   ├── auth/popup-done/page.tsx         # 로그인 콜백: postMessage 후 창 닫기 또는 /classes로 이동
│   ├── classes/
│   │   ├── page.tsx                     # 학급 목록
│   │   ├── new/page.tsx                 # 학급 등록 (학년·반)
│   │   └── [id]/
│   │       ├── page.tsx                 # 학급 상세: 학기·과목 선택 → 단원 선택 링크
│   │       ├── students/page.tsx        # 해당 학급 학생 명단
│   │       ├── units/page.tsx           # 단원 선택 (체크박스, 세션만 저장)
│   │       ├── level-step/page.tsx      # 레벨 2/3/4단계 선택 (세션만 저장)
│   │       └── ratings/page.tsx         # 선택 단원·레벨단계에 따른 등급 + 학습 활동, 평어 생성 링크
│   ├── api/generate-comment/route.ts    # POST: templateSentence + activities → GPT-4o-mini 재작성
│   ├── students/page.tsx                # → /classes 리다이렉트
│   ├── ratings/page.tsx                 # → /classes 리다이렉트
│   └── review/page.tsx                  # 선택 단원 기준 평어. 학급 필수(없으면 안내).
├── src/components/
│   ├── AppNav.tsx                       # 네비: 홈, 학급 목록, 로그인/로그아웃
│   ├── LandingAuth.tsx                  # 랜딩: 회원가입 버튼(signIn('google')), 체험하기 링크
│   └── SessionProvider.tsx              # next-auth SessionProvider 래퍼
├── src/lib/
│   ├── auth.ts                          # Auth.js v5: NextAuth() → { handlers, auth, signIn, signOut } export
│   ├── generator.ts                     # deterministic 평어 생성
│   ├── types.ts                         # Classroom, Semester, SubjectCode, Level, LevelStep, Area, ...
│   ├── actions/classrooms.ts            # Server Actions: 학급 CRUD, 학생, 등급, 활동, 리뷰 데이터
│   └── supabase/client.ts, server.ts
├── src/store/
│   ├── app-store.ts                     # classroom, semester, subject, selectedAreaIds, levelStep
│   └── guest-store.ts                   # 비로그인: classrooms, studentsByClass, ratings, activitiesByClass (메모리만)
├── src/types/
│   └── next-auth.d.ts                   # NextAuth Session 타입 확장 (user.id)
├── src/styles/globals.css               # 전체 스타일 + 모바일 반응형
├── wrangler.jsonc                       # Cloudflare Worker: report-mate.org, www, workers_dev=false
├── open-next.config.ts                  # OpenNext Cloudflare
├── DEPLOY.md                            # 배포 가이드 (환경 변수, report-mate.org)
├── public/manifest.json                 # PWA. theme_color #E07B54. 아이콘 /icons/icon-*x*.png
├── public/icons/                        # 72~512px PNG 아이콘
├── supabase/migrations/                 # 9개 마이그레이션 SQL
├── scripts/
│   ├── seed-국어수학-평어.mjs            # 국어·수학 1학기 areas + 평어 INSERT
│   ├── generate-placeholder-icons.js    # sharp로 PWA 아이콘 생성
│   └── seed-data/                       # 국어/수학 areas·평어 JSON 4개
```

---

## 5. DB 스키마 (Supabase)

- **classrooms**: `id`, `grade`, `class_number`, `name`, **`user_id`**(text, NextAuth 사용자 소유). unique(grade, class_number). user_id NULL이면 로그인 사용자 목록에 안 나옴.
- **areas**: `id`, `subject`, `name`, `order_index`, `semester`(1|2). 과목·학기별 단원.
- **templates**: `id`, `area_id`(FK), `level`('1'|'2'|'3'|'4'), `sentence`.
- **students**: `id`, `number`, `name`, `classroom_id`(FK, nullable).
- **ratings**: `(student_id, area_id)` PK, `level`('1'|'2'|'3'|'4').
- **activities**: `id`, `classroom_id`, `semester`, `subject`, `description`, `created_at` — GPT 평어 재작성 시 참고.

UI 등급 표기: **1=매우잘함, 2=잘함, 3=보통, 4=노력요함.**

---

## 6. 평어 생성·리뷰 (generator.ts, /api/generate-comment, /review)

- **기본 생성**: `generateComment(areaLevels, templates, { studentId })` — deterministic, DB templates만 사용.
- **선택적 GPT**: 해당 학급·학기·과목에 **activities**가 있으면 /review에서 문장별로 `POST /api/generate-comment` 호출. GPT-4o-mini가 활동 반영 재작성. `.env.local`에 `OPENAI_API_KEY` 필요.
- /review: **선택된 단원(selectedAreaIds)**이 있으면 해당 단원만 사용해 평어 생성. 학급 컨텍스트 없으면 "학급을 먼저 선택하세요" 안내.

---

## 7. 다음에 할 수 있는 작업

- [ ] 통합(바생·슬생·즐생) templates 시드 (필요 시)
- [ ] 엑셀 다운로드: review 결과 xlsx 내보내기
- [ ] DB orphan 학생/ratings 정리 (Supabase SQL Editor에서 실행)

---

## 8. 환경·배포 요약

- **로컬**: `next-app/.env.local` → `NEXTAUTH_URL=http://localhost:3000`, NextAuth 4개 값, Supabase 2개 값, OPENAI_API_KEY(선택).
- **배포**: Cloudflare Workers. `wrangler.jsonc`에 vars(NEXTAUTH_URL, AUTH_TRUST_HOST, GOOGLE_CLIENT_ID). Secrets: NEXTAUTH_SECRET, GOOGLE_CLIENT_SECRET. `npm run deploy:cf`.
- **Google OAuth**: 테스트 앱이면 OAuth 동의 화면 → 테스트 사용자에 이메일 등록 필요.
- **인증 방식**: `signIn('google', { callbackUrl: '/auth/popup-done' })` (POST 방식, CSRF 검증 후 OAuth 시작). Auth.js v5는 Web Fetch API 사용 → Cloudflare Workers 완전 호환. 서버에서 세션 조회: `auth()` (getServerSession 대신).

---

## 9. 참고

- **문서**: `next-app/DEPLOY.md`(배포·로그인 점검), `next-app/ERRORS_AND_SETUP.md`(설정·에러).
- **시드 재실행**: `node scripts/seed-국어수학-평어.mjs` (next-app 폴더에서, .env.local 필요).
- **DB 정리 SQL**: orphan 학생 삭제 → `DELETE FROM ratings WHERE student_id IN (SELECT id FROM students WHERE classroom_id IS NULL); DELETE FROM students WHERE classroom_id IS NULL;`
