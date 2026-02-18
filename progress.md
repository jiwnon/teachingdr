# ReportMate — 진행 상황 요약

> **새 Cursor Agent / 새 채팅에서** 이 문서만 읽으면 프로젝트와 지금까지의 작업 맥락을 파악할 수 있도록 정리한 문서입니다.

---

## 1. 프로젝트 개요

- **이름**: ReportMate (RM)
- **목적**: 초등 1학년 1학기 **국어/수학** 생활기록부 평어 자동 생성 **웹앱** (엑셀 대체용)
- **성격**: 단일 반 도구. **SaaS 아님.** 로그인·프로젝트·멀티테넌트 없음.
- **스택**: Next.js 14 (App Router) + TypeScript, Supabase (Postgres), Zustand.

**핵심 제약**

- **AI/LLM 사용 금지.** 문장은 반드시 DB `templates` 테이블에서만 선택.
- **Math.random() 금지.** 평어 생성은 **deterministic** (`src/lib/generator.ts`).

---

## 2. 사용자 사용 흐름 (UX)

1. **앱 접속** → 메인에서 1·2·3단계 안내 확인
2. **1단계: 학생 명단** (`/students`) → 번호·이름 입력 후 저장 (Supabase `students`)
3. **2단계: 과목·등급** (`/ratings`) → 과목(국어/수학) 선택 → 학생별·단원별로 **매우잘함/잘함/보통/노력요함** 선택 (변경 시 자동 저장, `ratings`)
4. **3단계: 평어 생성** (`/review`) → **평어 생성** 시 등급에 맞는 문장만 DB에서 골라 단원별로 이어 붙여 표시 → 수정·복사

즉, **등급을 고르면 그에 맞는 평어 문장이 자동으로 선택**되도록 설계되어 있음.

---

## 3. 현재 구현 상태 (MVP 기준)

| 구분 | 상태 | 비고 |
|------|------|------|
| 라우팅 | ✅ | `/`, `/students`, `/ratings`, `/review` |
| 사용 순서 | ✅ | 1. 학생 명단 → 2. 과목·등급 → 3. 평어 생성 |
| DB 스키마 | ✅ | areas, templates, students, ratings. **등급 4단계** 반영 마이그레이션 있음. |
| 등급 체계 | ✅ | **매우잘함(1) / 잘함(2) / 보통(3) / 노력요함(4)** — 이전 상/중/하에서 변경됨 |
| 템플릿 시드 | ✅ | xlsx용 `seed-templates.mjs` + **국어 1학년 1학기** 전용 `seed-국어-평어.mjs` (areas + 평어 문장 일괄 등록) |
| /students | ✅ | 번호·이름 테이블, 행 추가, Supabase 저장 |
| /ratings | ✅ | 과목 선택 + 학생별·단원별 4단계 등급 select, areas 없으면 등급 열 1개만 표시 |
| /review | ✅ | 평어 표시, 수정 버튼으로 편집, 복사. 다시 생성 버튼 없음 |
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
│   ├── page.tsx              # 메인 (1·2·3단계 링크)
│   ├── students/page.tsx     # 1단계: 학생 명단
│   ├── ratings/page.tsx      # 2단계: 과목 + 등급(4단계) 테이블
│   └── review/page.tsx       # 3단계: 평어 표시·수정·복사
├── src/components/
│   ├── AppNav.tsx
│   └── GradeTable.tsx        # 단원별 등급 테이블 (4단계 옵션)
├── src/lib/
│   ├── generator.ts          # deterministic 평어 생성
│   ├── types.ts              # Level = '1'|'2'|'3'|'4', Area, Template, Student, Rating
│   └── supabase/client.ts
├── src/store/
│   ├── app-store.ts
│   └── students-store.ts
├── src/styles/globals.css
├── supabase/migrations/
│   ├── 20240216100000_rm_mvp_schema.sql
│   └── 20240217100000_level_four_steps.sql   # 등급 4단계 CHECK 추가
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

- **areas**: `id`, `subject`, `name`, `order_index` — 과목별 단원.
- **templates**: `id`, `area_id`(FK), **`level`('1'|'2'|'3'|'4')**, `sentence`.
- **students**: `id`, `number`, `name`.
- **ratings**: `(student_id, area_id)` PK, **`level`('1'|'2'|'3'|'4')**.

UI 등급 표기: **1=매우잘함, 2=잘함, 3=보통, 4=노력요함.**

---

## 6. 평어 생성·리뷰 (generator.ts, /review)

- **순수 함수.** Math.random/LLM 미사용. `pickSentence`, `generateComment(areaLevels, templates, { studentId })`.
- 학생별로 (학생ID, 단원ID, 등급)당 해당 `area_id`·`level`인 templates 중 하나를 **deterministic** 선택해 이어 붙임.
- /review: 수정 버튼으로 textarea 편집, 수정 완료 시 읽기 전용, 복사는 현재 표시 내용 기준.

---

## 7. 다음에 할 수 있는 작업

- [x] 국어 areas + 평어 문장 시드 (PDF 기반, 4단계 재분류 완료)
- [ ] 수학 areas/templates 시드 (필요 시 동일 방식)
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

- **진행 이력**: MVP 단순화 → 스키마 → generator deterministic → 페이지 Supabase 연동 → UI·순서 고정 → 평어 수정 기능 → **등급 4단계 전환** → **국어 PDF 기반 시드 + 4단계 재분류**.
- **설정·에러**: `next-app/ERRORS_AND_SETUP.md`, `next-app/README.md`.
- **시드 재실행**: 기존 국어 templates를 지우고 `node scripts/seed-국어-평어.mjs` 다시 실행하면 4단계 재분류 데이터로 덮어쓰기 가능.
