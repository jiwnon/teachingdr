# ReportMate — 진행 상황 요약

> **새 Cursor Agent / 새 채팅에서** 이 문서만 읽으면 프로젝트와 지금까지의 작업 맥락을 파악할 수 있도록 정리한 문서입니다.

---

## 1. 프로젝트 개요

- **이름**: ReportMate (RM)
- **목적**: 초등 1학년 1·2학기 **국어/수학/통합** 생활기록부 평어 자동 생성 **웹앱** (엑셀 대체용)
- **성격**: 단일 반 도구. **SaaS 아님.** 로그인·프로젝트·멀티테넌트 없음.
- **스택**: Next.js 15 (App Router) + TypeScript, Supabase (Postgres), Zustand, **Auth.js v5 / next-auth@5 (Google OAuth)**.
- **배포**: Cloudflare Workers (OpenNext). **접속 URL**: https://report-mate.org (www.report-mate.org 동일). workers.dev 비활성화.
- **인증**: 비로그인도 학급→등급→평어 생성까지 **체험 가능**(저장 안 됨). 로그인 시 본인 학급만 저장·조회.

**핵심 제약**

- **기본 평어**: DB `templates` 테이블에서 문장 선택. **같은 단원·같은 레벨이라도 학생마다 서로 다른 문장 배정** (Fisher–Yates 셔플, 부족 시 순환). `src/lib/generator.ts`의 `buildSentenceAssignment`.
- **선택적 GPT**: 해당 학급·학기·과목에 **활동 메모(activities)**가 있으면 OpenAI GPT-4o-mini로 문장 재작성 (`/api/generate-comment`). 없으면 템플릿 문장 그대로 사용.

---

## 2. 사용자 사용 흐름 (UX)

**앱 접속 시**

- **비로그인**: 메인(/)에서 **랜딩** — "ReportMate는 초등 선생님을 위한 평어 생성 서비스입니다", **회원가입** 버튼(클릭 시 `signIn('google', { callbackUrl: '/auth/popup-done' })` → Google OAuth → 완료 시 `/auth/popup-done` → `/classes` 이동), **로그인 없이 체험하기** 링크. 체험 시 학급·등급·평어 모두 가능하나 **저장되지 않음**(메모리·게스트 스토어만).
- **로그인**: 메인(/)에서 학급 목록·등록 안내(기존과 동일). 학급·학생·등급·활동은 **본인(user_id)만** 저장·조회.

### 국어/수학 흐름

1. **학급 상세** (`/classes/[id]`) → 학기·과목 선택 → **단원 선택**으로 이동
2. **단원 선택** (`/classes/[id]/units?sem=&subject=`) → 체크박스로 단원 여러 개 선택 (최소 1개). 세션만 유지.
3. **레벨 단계 선택** (`/classes/[id]/level-step?sem=&subject=`) → 2/3/4단계 중 선택. 세션만 유지.
4. **등급 입력** (`/classes/[id]/ratings?sem=&subject=`) → 선택된 단원만 열로 표시, 레벨 select. 학습 활동 입력(선택). 자동 저장.
5. **평어 생성** (`/review`) → 선택 단원 기준 학생별 평어. 활동 있으면 GPT 재작성. 수정·복사.

### 통합(바른생활·슬기로운생활·즐거운생활) 흐름

1. **학급 상세** → 학기·**통합** 선택 → **바로 등급 입력**으로 이동 (단원 선택·레벨 단계 페이지 건너뜀)
2. **등급 입력** (`/classes/[id]/ratings?sem=&subject=통합`) →
   - 상단에 **레벨 단계** 버튼 (2/3/4단계, 기본 4단계)
   - 테이블: 번호 | 이름 | 바른생활 | 슬기로운생활 | 즐거운생활
   - 각 셀 안에 **단원 드롭다운** (학교/사람들/우리나라/탐험) + **레벨 드롭다운** 가로 배치
   - 학생마다 다른 단원·레벨 선택 가능. 기본값(학교, 잘함)은 페이지 로드 시 자동 저장됨.
   - DB area 이름 형식: `"테마(생활)"` (예: `학교(바른생활)`, `우리나라(슬기로운생활)`)
3. **평어 생성** (`/review`) → 학생별 ratings(3건: 바/슬/즐 각 1)으로 areaLevels 구성, 평어 3줄 생성.

**레벨 단계 매핑 (DB는 1~4 유지)**

- DB `templates`/`ratings`의 `level`은 항상 `'1'|'2'|'3'|'4'`.
- 2단계 선택 시: 잘함 → DB 2, 노력요함 → DB 4 (표시 시 1,2,3 → 잘함).
- 3단계: 잘함→2, 보통→3, 노력요함→4 (표시 시 1,2→잘함).
- 4단계: 매우잘함→1, 잘함→2, 보통→3, 노력요함→4.
- 통합 평가도 동일: `LEVEL_STEP_OPTIONS` + `levelToSelectValue()` 공유.

**기존 `/students`, `/ratings` 페이지**는 `/classes`로 리다이렉트됨. `/review`는 학급 컨텍스트 없이 접근 시 "학급을 먼저 선택하세요" 안내.

---

## 3. 현재 구현 상태 (MVP 기준)

| 구분 | 상태 | 비고 |
|------|------|------|
| 인증 | ✅ | **Auth.js v5 (next-auth@5)**, Google OAuth. `signIn('google')` (POST 방식). Web Fetch API → Cloudflare Workers 호환. |
| 데이터 격리 | ✅ | `classrooms.user_id`, Server Actions로 목록/생성/소유 확인. 타 사용자 학급 미노출 |
| 비로그인 체험 | ✅ | 게스트 스토어(Zustand). 학급·학생·등급·활동 메모리만, DB 미저장. ID 접두사 `guest-` |
| 라우팅 | ✅ | `/`, `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/students`, `/classes/[id]/units`, `/classes/[id]/level-step`, `/classes/[id]/ratings`, `/review`. |
| 학급·학기·과목 | ✅ | 학급 등록, 1·2학기, **국어/수학/통합** 선택 |
| 국어/수학 단원 선택 | ✅ | 체크박스로 단원 여러 개 선택, 세션만 저장 |
| 통합 평가 | ✅ | 단원 선택 페이지 없이 ratings에서 학생별 (단원+레벨) 동시 선택. 기본값 자동 저장. |
| 레벨 단계 | ✅ | 2/3/4단계 선택. 국어/수학은 별도 페이지, 통합은 ratings 내 인라인 선택 |
| DB 스키마 | ✅ | classrooms, activities, areas(semester), templates, students(classroom_id), ratings. level 1~4. |
| 등급 체계 | ✅ | **매우잘함(1) / 잘함(2) / 보통(3) / 노력요함(4)**. UI에서 2/3/4단계로 축약 표시. |
| 템플릿 시드 | ✅ | **1학기**: 국어·수학 `seed-국어수학-평어.mjs` + JSON 4개, 통합 `seed-통합-평어.mjs` + JSON 2개. **2학기**: 국어·수학·통합 `seed-2학기-평어.mjs` + JSON 6개(areas 3 + 평어 3). |
| 평어 생성 | ✅ | 같은 (단원, 레벨)이라도 학생마다 **다른 문장 배정** (랜덤 셔플, 중복 방지, 부족 시 순환). |
| /review | ✅ | 국어/수학: selectedAreaIds 기준. 통합: 학생별 ratings 기준 areaLevels. GPT 재작성·수정·복사. **줄바꿈 허용** 체크박스(해제 시 한 줄로 붙여서 보기·복사, 성적서 붙여넣기용). |
| UI/디자인 | ✅ | 따뜻한 색상(살구/테라코타), 아이보리 배경, rounded corners. 모바일 반응형. PWA 아이콘. |
| 배포 | ✅ | Cloudflare Workers (OpenNext). report-mate.org 커스텀 도메인. `npm run deploy:cf`. |
| 엑셀 다운로드 | ✅ | /review에서 XLSX 다운로드. 과목·단원·이름·평어 칼럼. `xlsx` 라이브러리 사용. |
| 피드백 게시판 | ✅ | `/feedback`. 익명 글 작성(로그인 필수), 관리자·본인 삭제. DB `feedback` 테이블. |

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
│   │       ├── page.tsx                 # 학급 상세: 학기·과목 선택. 통합→바로 ratings, 국어/수학→units
│   │       ├── students/page.tsx        # 해당 학급 학생 명단
│   │       ├── units/page.tsx           # 국어/수학: 체크박스 단원 선택. 통합: 사용하지 않음.
│   │       ├── level-step/page.tsx      # 국어/수학: 레벨 2/3/4단계 선택 (세션만 저장)
│   │       └── ratings/page.tsx         # 국어/수학: 단원별 레벨. 통합: 학생별 (단원+레벨)×3 테이블.
│   ├── api/generate-comment/route.ts    # POST: templateSentence + activities → GPT-4o-mini 재작성
│   ├── feedback/page.tsx                # 익명 피드백 게시판 (로그인 필수, 관리자·본인 삭제)
│   ├── students/page.tsx                # → /classes 리다이렉트
│   ├── ratings/page.tsx                 # → /classes 리다이렉트
│   └── review/page.tsx                  # 학생별 평어. 국어/수학: selectedAreaIds. 통합: 학생별 ratings. 엑셀 다운로드.
├── src/components/
│   ├── AppNav.tsx                       # 네비: 홈, 학급 목록, 피드백, 로그인/로그아웃
│   ├── LandingAuth.tsx                  # 랜딩: 회원가입 버튼(signIn('google')), 체험하기 링크
│   └── SessionProvider.tsx              # next-auth SessionProvider 래퍼
├── src/lib/
│   ├── auth.ts                          # Auth.js v5: NextAuth() → { handlers, auth, signIn, signOut }
│   ├── generator.ts                     # 평어 생성: buildSentenceAssignment(랜덤 배정), generateComment
│   ├── types.ts                         # Classroom, Semester, SubjectCode('통합' 포함), Level, LevelStep, INTEGRATED_THEMES/LIVES, ...
│   ├── actions/classrooms.ts            # Server Actions: 학급 CRUD, 학생, 등급, 활동, 리뷰 데이터
│   ├── actions/feedback.ts             # Server Actions: 피드백 CRUD, 관리자 판별
│   ├── xlsx-export.ts                  # XLSX 다운로드 유틸 (downloadReviewXlsx)
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
├── supabase/migrations/                 # 12개 마이그레이션 (classrooms_school_year, activities_area_id, feedback 포함)
├── scripts/
│   ├── seed-국어수학-평어.mjs            # 국어·수학 1학기 areas + 평어 INSERT
│   ├── seed-통합-평어.mjs               # 통합 1학기 areas(12개) + 평어 INSERT (subject='통합')
│   ├── seed-2학기-평어.mjs              # 국어·수학·통합 2학기 areas + 평어 INSERT (3과목 통합 스크립트)
│   ├── generate-placeholder-icons.js    # sharp로 PWA 아이콘 생성
│   └── seed-data/                       # 국어/수학/통합 areas + 평어 문장 (1학기 + 2학기)
│       ├── 국어-1학년1학기-areas.json
│       ├── 국어-평어-문장.json
│       ├── 수학-1학년1학기-areas.json
│       ├── 수학-평어-문장.json
│       ├── 통합-1학년1학기-areas.json    # 12 areas (4 테마 × 3 생활), subject='통합'
│       ├── 통합-평어-문장.json          # level 1~4 × 12 areas 평어 문장
│       ├── 국어-1학년2학기-areas.json    # 8 areas, semester=2
│       ├── 국어-2학기-평어-문장.json     # 88건
│       ├── 수학-1학년2학기-areas.json    # 6 areas, semester=2
│       ├── 수학-2학기-평어-문장.json     # 66건
│       ├── 통합-1학년2학기-areas.json    # 12 areas (4 테마 × 3 생활), semester=2
│       └── 통합-2학기-평어-문장.json     # 132건
```

---

## 5. DB 스키마 (Supabase)

- **classrooms**: `id`, `grade`, `class_number`, `name`, **`user_id`**(text, NextAuth 사용자 소유), **`school_year`**(int, nullable, 학년도 예: 2025 → "2025년 1학년 1반" 표시). unique(grade, class_number).
- **areas**: `id`, `subject`, `name`, `order_index`, `semester`(1|2). 과목·학기별 단원.
  - 국어/수학: `subject='국어'|'수학'`
  - 통합: `subject='통합'`, name 형식 `"테마(생활)"` (예: `학교(바른생활)`)
- **templates**: `id`, `area_id`(FK), `level`('1'|'2'|'3'|'4'), `sentence`.
- **students**: `id`, `number`, `name`, `classroom_id`(FK, nullable).
- **ratings**: `(student_id, area_id)` PK, `level`('1'|'2'|'3'|'4').
- **activities**: `id`, `classroom_id`, `semester`, `subject`, `description`, **`area_id`**(FK to areas, nullable, 해당 단원), `created_at` — GPT 평어 재작성 시 참고. 등급 페이지에서 단원 드롭다운으로 선택 가능.
- **feedback**: `id`(UUID), `user_id`(text), `content`(text), `created_at`. 익명 피드백. UI에 user_id 미노출. 관리자(`ADMIN_EMAIL`) 또는 본인만 삭제 가능.

UI 등급 표기: **1=매우잘함, 2=잘함, 3=보통, 4=노력요함.**

---

## 6. 평어 생성 (generator.ts, /api/generate-comment, /review)

### 기본 생성 (generator.ts)

- **`buildSentenceAssignment(students, ratings, templates, areaIds)`**
  - 같은 (area_id, level) 그룹 내 학생들에게 서로 다른 문장 인덱스 배정 (Fisher–Yates 셔플)
  - 학생 수 > 문장 수이면 순환 재사용
  - 반환: `Map<studentId, Map<"areaId:level", templateIndex>>`
- **`generateCommentLines(areaLevels, templates, { studentId, sentenceIndexMap })`**
  - 단원별 `Array<{ areaId, sentence }>` 반환. GPT 호출 시 단원별 활동 필터링에 활용.
- **`generateComment(...)`**: `generateCommentLines()`를 호출한 뒤 `join('\n')`으로 문자열 반환 (기존 호환).

### 선택적 GPT (/api/generate-comment)

- **단원별 활동 필터링**: 각 줄(단원)마다 `activities.area_id`가 일치하는 활동만 GPT에 전달. 해당 단원에 활동이 없으면 템플릿 문장 그대로 사용 (GPT 미호출). `area_id`가 null인 활동(단원 미지정)은 무시.
- `.env.local`에 `OPENAI_API_KEY` 필요

### /review 페이지

- **국어/수학**: `selectedAreaIds` 기준 areasFiltered → 학생별 areaLevels 구성
- **통합**: 학생별 **ratings에 등장하는 area_id** 기준 → 바른생활·슬기로운생활·즐거운생활 순으로 정렬 → areaLevels 구성
- 학급 컨텍스트 없으면 "학급을 먼저 선택하세요" 안내

---

## 7. 최근 세션 작업 요약 (2025-02)

- **학급 등록 연도**: 학급 등록 폼에 **연도** 선택 추가(기본 올해). DB `classrooms.school_year` 추가. 목록·상세·학생 명단·등급/단원/레벨단계 제목에서 "2025년 1학년 1반" 형태로 표시. 마이그레이션: `20240221100000_classrooms_school_year.sql`.
- **학급 등록 UX**: 체험 시 버튼 문구 "체험 추가" → **"학생 추가"**. 등록(또는 학생 추가) 후 **학생 명단** 페이지(`/classes/[id]/students`)로 바로 이동.
- **학생 명단**: "학급으로 돌아가기" → **"과목·단원 선택하기"**.
- **seed-data 정리**: `국어-평어-문장-추가.json`, `수학-평어-문장-추가.json`, `통합-평어-문장-신규.json` 삭제. 내용은 각각 `국어-평어-문장.json`, `수학-평어-문장.json`, `통합-평어-문장.json`에 이미 반영됨.
- **GPT 학습활동 반영**: API 프롬프트 강화(활동 구체 반영 지시). 429/API키/rate limit 한글 안내. 리뷰 페이지에서 실패 시 **실제 오류 메시지** 표시. 체험 모드에서 areas/templates 로드 완료 후에만 GPT 호출하도록 로딩 순서 수정.
- **학습 활동 단원 연결**: 등급 페이지에서 활동 입력 시 **단원 드롭다운** 추가(선택 안 함 가능). DB `activities.area_id` 추가. 활동 목록에 `[단원명] 활동 설명` 형태로 표시. 마이그레이션: `20240222100000_activities_area_id.sql`.
- **seed-data 국어/수학 areas**: `국어-1학년1학기-areas.json`에 **국어 종합**(order_index 8), `수학-1학년1학기-areas.json`에 **수학 종합**(order_index 5) 추가. 평어 문장 JSON에 해당 `areaName`이 없으면 해당 단원은 템플릿 0개로 시드됨(문장 추가 후 시드 재실행 시 반영).
- **리뷰 페이지 줄바꿈 옵션**: **줄바꿈 허용** 체크박스 추가. 체크 시 줄바꿈된 상태로 보기·복사, 해제 시 세 줄을 한 줄로 붙여서 보기·복사(성적서 붙여넣기용).
- **GPT 단원별 활동 필터링**: `generateCommentLines()` 함수 추가. /review에서 각 줄(단원)마다 `activity.area_id`가 일치하는 활동만 GPT에 전달. 해당 단원에 활동이 없으면 DB 템플릿 문장 그대로 사용(GPT 미호출). `area_id` null(단원 미지정) 활동은 무시.
- **평어 무한로딩 수정**: templates가 없어 `baseText`가 빈 문자열이면 GPT 루프 결과도 빈 문자열 → 영원히 "평어 생성 중..." 표시되던 버그 수정. 빈 결과 시 안내 메시지 출력.
- **DB 제약 수정**: `templates_level_check`가 `('1','2','3')`만 허용하던 것을 `('1','2','3','4')`로 수정 (Supabase SQL Editor). 시드 스크립트에도 자동 수정 시도 로직 추가.
- **UI 문구 통일**: "레벨 단계" → "등급 단계", 단원 선택 안내 문구에 구체적 예시 추가, 등급 입력 페이지 설명 개선.
- **모바일 반응형 전면 개선**:
  - **통합 등급 페이지**: 5칸 테이블 → 학생별 **카드 레이아웃**으로 변경. 데스크탑은 바른/슬기/즐거운 가로 배치, 모바일은 세로 배치.
  - **활동 입력**: 인라인 스타일 → CSS 클래스(`activity-input-row`). 모바일에서 단원 선택·텍스트 입력이 세로 배치.
  - **통합 단원 선택**: 인라인 스타일 → CSS 클래스(`integrated-unit-select-*`). 모바일에서 드롭다운 축소.
  - **하단 버튼**: 인라인 스타일 → `action-buttons` 클래스. `flex-wrap` 보장.
  - **전체**: 헤더·카드·버튼·테이블·리뷰 패딩/폰트 축소, 제목 줄바꿈 방지(`word-break: keep-all`).
- **엑셀 다운로드**: `/review` 페이지에 "엑셀 다운로드" 버튼 추가. `xlsx` 라이브러리로 XLSX 파일 생성. 칼럼: 과목·단원·이름·평어. 파일명: `{연도}년_{학년}학년{반}반_{과목}_평어.xlsx`. GPT 생성 중 비활성화. `src/lib/xlsx-export.ts` 유틸 함수.
- **익명 피드백 게시판**: `/feedback` 페이지 신규. 로그인 사용자만 글 작성·열람. 익명(user_id는 DB에만 저장, UI 미노출). 관리자(`ADMIN_EMAIL` 환경변수) 또는 본인만 삭제 가능. DB `feedback` 테이블. Server Actions: `src/lib/actions/feedback.ts`. 마이그레이션: `20240223100000_feedback.sql`. `auth.ts`에 email 전달 추가. AppNav에 "피드백" 링크.

---

## 8. 다음에 할 수 있는 작업

- [x] 엑셀 다운로드: review 결과 xlsx 내보내기
- [x] 피드백 게시판: 익명 피드백 작성·열람·삭제
- [ ] DB orphan 학생/ratings 정리 (Supabase SQL Editor에서 실행)
- [x] 2학기 국어·수학·통합 시드 데이터 추가 (areas 26개 + templates 286건)

---

## 9. 환경·배포 요약

- **로컬**: `next-app/.env.local` → `NEXTAUTH_URL=http://localhost:3000`, NextAuth 4개 값, Supabase 2개 값, OPENAI_API_KEY(선택).
- **배포**: Cloudflare Workers. `wrangler.jsonc`에 vars(NEXTAUTH_URL, AUTH_TRUST_HOST, GOOGLE_CLIENT_ID, ADMIN_EMAIL). Secrets: NEXTAUTH_SECRET, GOOGLE_CLIENT_SECRET. `npm run deploy:cf`.
- **Google OAuth**: 테스트 앱이면 OAuth 동의 화면 → 테스트 사용자에 이메일 등록 필요.
- **인증 방식**: `signIn('google', { callbackUrl: '/auth/popup-done' })` (POST 방식, CSRF 검증 후 OAuth 시작). Auth.js v5는 Web Fetch API 사용 → Cloudflare Workers 완전 호환. 서버에서 세션 조회: `auth()` (getServerSession 대신).

---

## 10. 참고

- **문서**: `next-app/DEPLOY.md`(배포·로그인 점검), `next-app/ERRORS_AND_SETUP.md`(설정·에러).
- **시드 재실행**:
  - 1학기 국어·수학: `node scripts/seed-국어수학-평어.mjs` (next-app 폴더에서)
  - 1학기 통합: `node scripts/seed-통합-평어.mjs` (next-app 폴더에서)
  - 2학기 국어·수학·통합: `node scripts/seed-2학기-평어.mjs` (next-app 폴더에서)
  - `.env.local`에 Supabase URL/Anon Key 필요
- **DB 정리 SQL**: orphan 학생 삭제 → `DELETE FROM ratings WHERE student_id IN (SELECT id FROM students WHERE classroom_id IS NULL); DELETE FROM students WHERE classroom_id IS NULL;`
