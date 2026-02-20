# ReportMate — 진행 상황 요약

> **새 Cursor Agent / 새 채팅에서** 이 문서만 읽으면 프로젝트와 지금까지의 작업 맥락을 파악할 수 있도록 정리한 문서입니다.

---

## 1. 프로젝트 개요

- **이름**: ReportMate (RM)
- **목적**: 초등 1학년 1학기 **국어/수학** 생활기록부 평어 자동 생성 **웹앱** (엑셀 대체용)
- **성격**: 단일 반 도구. **SaaS 아님.** 로그인·프로젝트·멀티테넌트 없음.
- **스택**: Next.js 15 (App Router) + TypeScript, Supabase (Postgres), Zustand.
- **배포**: Cloudflare Workers (OpenNext). **접속 URL**: https://report-mate.org (www.report-mate.org 동일). workers.dev 비활성화.

**핵심 제약**

- **기본 평어**: DB `templates` 테이블에서만 문장 선택. **Math.random() 금지.** `src/lib/generator.ts`는 deterministic.
- **선택적 GPT**: 해당 학급·학기·과목에 **활동 메모(activities)**가 있으면 OpenAI GPT-4o-mini로 문장 재작성 (`/api/generate-comment`). 없으면 템플릿 문장 그대로 사용.

---

## 2. 사용자 사용 흐름 (UX)

**학급 중심 흐름 (권장)**

1. **앱 접속** → 메인에서 학급 목록·등록 안내
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

**기존 흐름 (학급 없이)**  
`/students` → `/ratings` → `/review` (동일하게 사용 가능. 단원/레벨단계 선택 없이 전체 단원·4단계.)

---

## 3. 현재 구현 상태 (MVP 기준)

| 구분 | 상태 | 비고 |
|------|------|------|
| 라우팅 | ✅ | `/`, `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/students`, `/classes/[id]/units`, `/classes/[id]/level-step`, `/classes/[id]/ratings`, `/students`, `/ratings`, `/review` |
| 학급·학기·과목 | ✅ | 학급 등록, 1·2학기, 국어/수학/통합(바생·슬생·즐생) 선택 후 **단원 선택**으로 진입 |
| 단원 선택 | ✅ | 해당 과목·학기 전체 단원 체크박스, 최소 1개, 세션만 저장 |
| 레벨 단계 | ✅ | 2/3/4단계 선택, 세션만 저장. 등급 입력·평어 생성 시 프론트에서 DB 1~4와 매핑 |
| 사용 순서 | ✅ | 학급 → 학기 → 과목 → **단원 선택** → **레벨 단계 선택** → 등급 입력 → 평어 생성 |
| DB 스키마 | ✅ | classrooms, activities, areas(semester), templates, students(classroom_id), ratings. level 1~4. |
| 등급 체계 | ✅ | **매우잘함(1) / 잘함(2) / 보통(3) / 노력요함(4)**. UI에서 2/3/4단계로 축약 표시 가능. |
| 템플릿 시드 | ✅ | **국어·수학** 1학년 1학기: `seed-국어수학-평어.mjs` + seed-data JSON 4개 (areas 2개, 평어 문장 2개). 국어·수학 종합 제거됨. |
| /review | ✅ | **선택된 단원만** 기준 평어. 학급·학기·과목·activities 조회. 활동 있으면 GPT 재작성, 로딩·수정·복사. |
| 에러/환경 | ✅ | hasSupabaseEnv, .env.local 안내 |
| 배포 | ✅ | Cloudflare Workers (OpenNext). report-mate.org 커스텀 도메인. `npm run deploy:cf` |
| 엑셀 다운로드 | ❌ | 미구현 |
| 통합(바생·슬생·즐생) templates 시드 | ❌ | 필요 시 추가 |

---

## 4. 라우팅·파일 위치

```
next-app/
├── src/app/
│   ├── page.tsx                         # 메인 (학급 중심 안내)
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
│   ├── students/page.tsx                # (기존) 학생 명단
│   ├── ratings/page.tsx                 # (기존) 과목 + 등급 테이블 (학급 없이)
│   └── review/page.tsx                  # 선택 단원 기준 평어, 활동 있으면 API·로딩, 수정·복사
├── src/components/
│   ├── AppNav.tsx
│   ├── GradeTable.tsx
│   ├── SubjectSelector.tsx
│   ├── StudentInput.tsx
│   └── ResultViewer.tsx
├── src/lib/
│   ├── generator.ts
│   ├── types.ts                         # Classroom, Semester, SubjectCode, Level, LevelStep, Area, LEVEL_STEP_OPTIONS, levelToSelectValue, ...
│   └── supabase/client.ts
├── src/store/
│   ├── app-store.ts                     # classroom, semester, subject, selectedAreaIds, levelStep
│   └── students-store.ts
├── src/styles/globals.css
├── wrangler.jsonc                        # Cloudflare Worker: report-mate.org, www, workers_dev=false
├── open-next.config.ts                   # OpenNext Cloudflare
├── DEPLOY.md                             # 배포 가이드 (환경 변수, report-mate.org)
├── supabase/migrations/
│   ├── 20240216000000_elementary_comment_schema.sql
│   ├── 20240216100000_rm_mvp_schema.sql
│   ├── 20240217100000_level_four_steps.sql
│   ├── 20240218100000_classrooms_semester.sql
│   ├── 20240218110000_areas_semester_subjects.sql
│   ├── 20240218200000_activities.sql
│   ├── 20240219000000_truncate_areas_templates_ratings.sql   # areas CASCADE 비움
│   └── 20240219010000_remove_areas_종합.sql                  # 국어/수학 종합 삭제
├── scripts/
│   ├── seed-국어수학-평어.mjs            # 국어·수학 1학기 areas 삭제 후 areas 2파일 INSERT, 평어 2파일로 templates INSERT
│   ├── seed-templates.mjs               # (xlsx용) area|level|sentence
│   ├── seed-국어-평어.mjs                # (구) 국어 전용 시드
│   └── seed-data/
│       ├── 국어-1학년1학기-areas.json
│       ├── 국어-평어-문장.json
│       ├── 수학-1학년1학기-areas.json
│       └── 수학-평어-문장.json
```

---

## 5. DB 스키마 (Supabase)

- **classrooms**: `id`, `grade`, `class_number`, `name`. unique(grade, class_number).
- **areas**: `id`, `subject`, `name`, `order_index`, `semester`(1|2). 과목·학기별 단원. (국어·수학 1학기 시드는 seed-data + seed 스크립트로 등록.)
- **templates**: `id`, `area_id`(FK), `level`('1'|'2'|'3'|'4'), `sentence`.
- **students**: `id`, `number`, `name`, `classroom_id`(FK, nullable).
- **ratings**: `(student_id, area_id)` PK, `level`('1'|'2'|'3'|'4').
- **activities**: `id`, `classroom_id`, `semester`, `subject`, `description`, `created_at` — GPT 평어 재작성 시 참고.

UI 등급 표기: **1=매우잘함, 2=잘함, 3=보통, 4=노력요함.**  
레벨 단계 선택 시 프론트에서 2/3/4단계로 표시·저장 매핑.

---

## 6. 평어 생성·리뷰 (generator.ts, /api/generate-comment, /review)

- **기본 생성**: `generateComment(areaLevels, templates, { studentId })` — deterministic, DB templates만 사용.
- **선택적 GPT**: 해당 학급·학기·과목에 **activities**가 있으면 /review에서 문장별로 `POST /api/generate-comment` 호출. GPT-4o-mini가 활동 반영 재작성. `.env.local`에 `OPENAI_API_KEY` 필요.
- /review: **선택된 단원(selectedAreaIds)**이 있으면 해당 단원만 사용해 평어 생성. 없으면 전체 단원(기존 흐름 호환).

---

## 7. 다음에 할 수 있는 작업

- [x] 국어·수학 1학기 areas + 평어 문장 시드 (seed-국어수학-평어.mjs, JSON 4개)
- [x] 학급 → 학기 → 과목 → 단원 선택 → 레벨 단계 선택 → 등급 입력 → 평어 생성 흐름
- [x] 단원 선택·레벨 단계 세션 유지 (selectedAreaIds, levelStep)
- [x] 국어·수학 종합 제거 (areas 시드·DB·시드 데이터)
- [x] Cloudflare Workers 배포 (OpenNext), report-mate.org 커스텀 도메인
- [ ] 통합(바생·슬생·즐생) templates 시드 (필요 시)
- [ ] 엑셀 다운로드: review 결과 xlsx 내보내기
- [ ] npm 빌드 검증

---

## 8. 지금까지 대화에서 진행한 작업 (맥락)

- **실행 방법**: `.env.local` + 마이그레이션 + `npm run dev` (ERRORS_AND_SETUP.md 등).
- **등급 4단계**: 상/중/하 → **매우잘함/잘함/보통/노력요함**(1~4). DB CHECK, 타입, UI 반영.
- **국어·수학 시드 통합**: areas·templates 데이터 비우기(truncate/삭제) 후, **국어·수학 1학기** 전용 시드 스크립트 `seed-국어수학-평어.mjs` + seed-data 4개(국어/수학 areas, 국어/수학 평어 문장). **국어 종합·수학 종합** 제거(마이그레이션 + JSON 4개 수정).
- **평어 흐름 확장**: **단원 선택** 단계(체크박스, 최소 1개, 세션만) → **레벨 단계 선택**(2/3/4단계, 세션만) 추가. 등급 입력은 선택 단원·선택 레벨만 표시. DB level은 1~4 유지, 프론트에서 2/3/4단계 매핑. /review는 선택 단원만 사용해 평어 생성.
- **Cloudflare 배포**: OpenNext(`@opennextjs/cloudflare`)로 Next.js 15 앱을 Workers에 배포. Next 14→15 업그레이드, Supabase/타입 호환 수정. **report-mate.org** 커스텀 도메인 연결, `workers_dev: false`로 workers.dev 비활성화. 배포: `npm run deploy:cf`. 상세: `next-app/DEPLOY.md`.

---

## 9. 참고

- **학급·학기·과목**: classrooms, students.classroom_id, areas.semester. 국어/수학/통합(바생·슬생·즐생) 1·2학기.
- **활동 메모 + GPT**: activities 테이블. 등급 페이지에서 입력·삭제. /review에서 활동 있으면 문장별 API 호출.
- **진행 이력**: MVP → 스키마 → 4단계 등급 → 국어 시드 → 학급·학기·과목 → activities+GPT → **국어·수학 시드 통합·종합 제거** → **단원 선택·레벨 단계 선택** → **Cloudflare Workers 배포·report-mate.org**.
- **설정·에러**: `next-app/ERRORS_AND_SETUP.md`, `next-app/README.md`. **배포**: `next-app/DEPLOY.md`, 접속: https://report-mate.org
- **시드 재실행**: `node scripts/seed-국어수학-평어.mjs` (next-app 폴더에서, .env.local 필요).
