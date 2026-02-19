# ReportMate — 진행 상황 요약

> **새 Cursor Agent / 새 채팅에서** 이 문서만 읽으면 프로젝트와 지금까지의 작업 맥락을 파악할 수 있도록 정리한 문서입니다.

---

## 1. 프로젝트 개요

- **이름**: ReportMate (RM)
- **목적**: 초등 1학년 1학기 **국어/수학** 생활기록부 평어 자동 생성 **웹앱** (엑셀 대체용)
- **성격**: 단일 반 도구. **SaaS 아님.** 로그인·프로젝트·멀티테넌트 없음.
- **스택**: Next.js 14 (App Router) + TypeScript, Supabase (Postgres), Zustand.

**핵심 제약**

- **기본 평어**: DB `templates` 테이블에서만 문장 선택. **Math.random() 금지.** `src/lib/generator.ts`는 deterministic.
- **선택적 GPT**: 해당 학급·학기·과목에 **활동 메모(activities)**가 있으면 OpenAI GPT-4o-mini로 문장 재작성 (`/api/generate-comment`). 없으면 템플릿 문장 그대로 사용.

---

## 2. 사용자 사용 흐름 (UX)

**학급 중심 흐름 (권장)**

1. **앱 접속** → 메인에서 학급 목록·등록 안내
2. **학급 목록** (`/classes`) → 학급 등록(예: 1학년 1반) 또는 기존 학급 선택
3. **학급 상세** (`/classes/[id]`) → **1학기/2학기** 선택 → **과목** 선택 (국어 5단원 / 수학 5단원 / 통합 → 바생·슬생·즐생)
4. **등급 입력** (`/classes/[id]/ratings?sem=1&subject=국어`) → **이번 학기 학습 활동** 입력(선택), 학생별·단원별 등급 (자동 저장) → **3단계: 평어 생성** 링크로 이동
5. **평어 생성** (`/review`) → 학급·학기·과목 기준으로 학생별 평어 표시. 활동이 있으면 GPT가 반영해 재작성, 로딩 후 표시.

**기존 흐름 (학급 없이)**  
`/students` → `/ratings` → `/review` (동일하게 사용 가능)

즉, **등급을 고르면 그에 맞는 평어 문장이 자동으로 선택**되도록 설계되어 있음.

---

## 3. 현재 구현 상태 (MVP 기준)

| 구분 | 상태 | 비고 |
|------|------|------|
| 라우팅 | ✅ | `/`, `/classes`, `/classes/new`, `/classes/[id]`, `/classes/[id]/students`, `/classes/[id]/ratings`, `/students`, `/ratings`, `/review` |
| 학급·학기·과목 | ✅ | 학급 등록(1학년 1반), 1·2학기 선택, 국어/수학/통합(바생·슬생·즐생) 선택 후 등급 입력 |
| 사용 순서 | ✅ | 학급 목록 → 학급 선택 → 학기 → 과목 → 등급 입력 (또는 기존 학생 명단 → 과목·등급 → 평어) |
| DB 스키마 | ✅ | **classrooms**, **activities**, areas(**semester**), templates, students(**classroom_id**), ratings. 등급 4단계. |
| 등급 체계 | ✅ | **매우잘함(1) / 잘함(2) / 보통(3) / 노력요함(4)** — 이전 상/중/하에서 변경됨 |
| 템플릿 시드 | ✅ | xlsx용 `seed-templates.mjs` + **국어 1학년 1학기** 전용 `seed-국어-평어.mjs` (areas + 평어 문장 일괄 등록) |
| /students | ✅ | 번호·이름 테이블, 행 추가, Supabase 저장 |
| /ratings | ✅ | 과목 선택 + 학생별·단원별 4단계 등급 select, areas 없으면 등급 열 1개만 표시 |
| /review | ✅ | 학급·학기·과목 기준 데이터·activities 조회. 활동 있으면 `/api/generate-comment`(GPT-4o-mini) 호출해 문장 재작성, 로딩 상태 표시. 수정·복사. |
| 에러/환경 | ✅ | hasSupabaseEnv, .env.local 없을 때 안내 |
| UI/스타일 | ✅ | 헤더·네비, 카드, 버튼, 테이블, 4단계 등급 select |
| 국어 시드 데이터 | ✅ | PDF 예시 기반으로 **4단계에 맞춰 재분류** 완료 (아래 8. 참고) |
| 엑셀 다운로드 | ❌ | 미구현 |
| 수학 시드 | ❌ | 수동 또는 별도 시드 필요 |

---

## 4. 라우팅·파일 위치

```
next-app/
├── src/app/
│   ├── page.tsx                    # 메인 (학급 중심 안내)
│   ├── classes/
│   │   ├── page.tsx                # 학급 목록
│   │   ├── new/page.tsx            # 학급 등록 (학년·반)
│   │   └── [id]/
│   │       ├── page.tsx             # 학급 상세: 학기·과목 선택 → 등급 입력 링크
│   │       ├── students/page.tsx    # 해당 학급 학생 명단
│   │       └── ratings/page.tsx     # 해당 학급·학기·과목 등급 + 이번 학기 학습 활동, 평어 생성 링크
│   ├── api/generate-comment/route.ts   # POST: templateSentence + activities → GPT-4o-mini 재작성
│   ├── students/page.tsx           # (기존) 학생 명단
│   ├── ratings/page.tsx            # (기존) 과목 + 등급 테이블
│   └── review/page.tsx             # 학급·학기·과목·activities 기준 평어, 활동 있으면 API·로딩, 수정·복사
├── src/components/
│   ├── AppNav.tsx
│   └── GradeTable.tsx
├── src/lib/
│   ├── generator.ts
│   ├── types.ts                    # Classroom, Semester, SubjectCode(국어/수학/바생/슬생/즐생), Level, Area, ...
│   └── supabase/client.ts
├── src/store/
│   ├── app-store.ts                # classroom, semester, subject
│   └── students-store.ts
├── src/styles/globals.css
├── supabase/migrations/
│   ├── 20240216100000_rm_mvp_schema.sql
│   ├── 20240217100000_level_four_steps.sql
│   ├── 20240218100000_classrooms_semester.sql   # classrooms, students.classroom_id, areas.semester
│   ├── 20240218110000_areas_semester_subjects.sql # 국어2학기, 수학, 바생, 슬생, 즐생 1·2학기 각 5단원
│   └── 20240218200000_activities.sql            # activities (classroom_id, semester, subject, description)
├── scripts/
│   ├── seed-templates.mjs    # xlsx → templates (area|level|sentence)
│   ├── seed-국어-평어.mjs    # 국어 areas + 평어 문장 시드 (.env.local 자동 로드 시도)
│   └── seed-data/
│       ├── 국어-1학년1학기-areas.json
│       ├── 국어-평어-문장-pdf1.json   # 단원별 문장 (4단계 재분류)
│       ├── 국어-평어-문장-pdf2.json   # 종합 평어 19개 (4단계 배치)
│       └── 국어-평어-문장-pdf3.json   # 성취기준별 (자기소개·매체·띄어읽기·문장부호)
```

---

## 5. DB 스키마 (Supabase)

- **classrooms**: `id`, `grade`, `class_number`, `name` (예: 1학년 1반). unique(grade, class_number).
- **areas**: `id`, `subject`, `name`, `order_index`, **`semester`**(1|2) — 과목·학기별 단원. 국어/수학/바생/슬생/즐생 각 5단원, 1·2학기.
- **templates**: `id`, `area_id`(FK), **`level`('1'|'2'|'3'|'4')**, `sentence`.
- **students**: `id`, `number`, `name`, **`classroom_id`**(FK, nullable).
- **ratings**: `(student_id, area_id)` PK, **`level`('1'|'2'|'3'|'4')**.
- **activities**: `id`, **`classroom_id`**(FK), **`semester`**(1|2), **`subject`**, **`description`**, `created_at` — GPT 평어 재작성 시 참고.

UI 등급 표기: **1=매우잘함, 2=잘함, 3=보통, 4=노력요함.**  
과목: **국어**(5단원), **수학**(5단원), **통합** → 바생(바른생활)·슬생(슬기로운생활)·즐생(즐거운생활).

---

## 6. 평어 생성·리뷰 (generator.ts, /api/generate-comment, /review)

- **기본 생성**: `generateComment(areaLevels, templates, { studentId })` — deterministic, DB templates만 사용.
- **선택적 GPT**: 해당 학급·학기·과목에 **activities**가 있으면 /review에서 문장별로 `POST /api/generate-comment` 호출 (body: `templateSentence`, `activities[]`). GPT-4o-mini가 활동을 반영해 한 문장씩 재작성. `.env.local`에 `OPENAI_API_KEY` 필요.
- /review: 학급·학기·과목 기준으로 students/areas/ratings/activities 조회. 활동 없으면 템플릿 문장 그대로, 있으면 로딩 표시 후 API 결과 표시. 수정·복사.

---

## 7. 다음에 할 수 있는 작업

- [x] 국어 areas + 평어 문장 시드 (PDF 기반, 4단계 재분류 완료)
- [x] 학급·학기·과목: classrooms, areas.semester, 국어/수학/바생/슬생/즐생 1·2학기 각 5단원, 등급 입력까지
- [ ] 수학/통합(바생·슬생·즐생) templates 시드 (필요 시)
- [x] /review 학급·학기·과목·activities 연동, 활동 있으면 GPT-4o-mini 재작성 및 로딩 표시
- [ ] 엑셀 다운로드: review 결과 xlsx 내보내기
- [ ] npm 빌드 검증 (next.config·의존성 정리 후)

---

## 8. 지금까지 대화에서 진행한 작업 (맥락)

- **실행 방법 안내**: `.env.local` + 마이그레이션 + `npm run dev` 정리 (ERRORS_AND_SETUP.md 등).
- **국어 평어 DB 등록**: 사용자 제공 PDF 3종(국어 평어 1학년, 1학년 1학기 국어 평어, 1학기 국어 챗지피티)에서 문장 추출 → areas 13개(한글놀이~문장 부호 쓰임, 국어 종합 포함) 정의 + templates 시드 데이터(JSON 3개) 및 `seed-국어-평어.mjs` 작성.
- **등급 4단계 전환**: 기존 상/중/하(1/2/3) → **매우잘함/잘함/보통/노력요함**(1/2/3/4)으로 변경.  
  - DB: `templates`, `ratings`의 `level` CHECK에 '4' 추가 마이그레이션 (`20240217100000_level_four_steps.sql`).  
  - 타입: `Level = '1'|'2'|'3'|'4'`.  
  - UI: ratings 페이지, GradeTable, progress/README/ERRORS_AND_SETUP 문구 수정.
- **시드 데이터 4단계 재분류**:  
  - **pdf1**: 단원별 문장을 키워드 기준으로 1(적극·잘 연결·자신 있게 등), 2(기본), 3(알아봄·경험함 등), 4(필요·연습 등) 배치.  
  - **pdf2**: 종합 평어 19개를 말맛/수준으로 1(6개)·2(8개)·3(4개)·4(1개) 배치.  
  - **pdf3**: 챗지피티 PDF 성취기준별(자기소개 발표, 매체 관심, 띄어 읽기, 문장 부호 쓰임) 문장을 1·2·3·4별로 정리해 확장.

이렇게 해서 **학생·등급 선택 후 평어 생성 버튼으로 등급에 맞는 평어가 자동 생성**되도록 데이터와 앱을 맞춰 둔 상태입니다.

---

## 9. 참고

- **학급·학기·과목 (2024.02)**: 교실 템플릿: 학급 등록(1학년 1반), 1·2학기 선택, 과목(국어/수학/통합→바생·슬생·즐생) 선택 후 해당 학급 학생별·단원별 등급 입력. DB: classrooms, students.classroom_id, areas.semester, areas 시드(국어2학기, 수학, 바생, 슬생, 즐생 1·2학기 각 5단원).
- **활동 메모 + GPT 평어 (2024.02)**: DB `activities` 테이블 추가. 등급 페이지에 "이번 학기 학습 활동" 입력·목록·삭제 (Supabase 연동). `/api/generate-comment` POST로 templateSentence + activities → OpenAI GPT-4o-mini 호출해 문장 재작성. /review에서 학급·학기·과목·activities 기준으로 데이터 로드, 활동 있으면 문장별 API 호출 후 표시, 로딩 상태 표시. `OPENAI_API_KEY` in .env.local.
- **진행 이력**: MVP 단순화 → 스키마 → generator deterministic → 페이지 Supabase 연동 → UI·순서 고정 → 평어 수정 기능 → **등급 4단계 전환** → **국어 PDF 기반 시드 + 4단계 재분류** → **학급·학기·과목 흐름** → **activities + GPT-4o-mini 선택적 평어 재작성**.
- **설정·에러**: `next-app/ERRORS_AND_SETUP.md`, `next-app/README.md`.
- **시드 재실행**: 기존 국어 templates를 지우고 `node scripts/seed-국어-평어.mjs` 다시 실행하면 4단계 재분류 데이터로 덮어쓰기 가능.
