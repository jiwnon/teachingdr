# ReportMate — 진행 상황 요약

> **새 Cursor Agent 대화 시작 시** 이 문서로 프로젝트 현황을 파악할 수 있습니다.

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

## 2. 현재 구현 상태 (MVP 기준)

| 구분 | 상태 | 비고 |
|------|------|------|
| 라우팅 | ✅ | `/`, `/students`, `/ratings`, `/review` |
| 사용 순서 | ✅ | 1. 학생 명단 → 2. 과목·등급 입력 → 3. 평어 생성 |
| DB 스키마 | ✅ | areas, templates, students, ratings (마이그레이션 적용됨) |
| 템플릿 시드 | ✅ | xlsx → templates insert 스크립트 있음 |
| /students | ✅ | 1단계. 번호·이름 테이블, 행 추가, Supabase 저장 |
| /ratings | ✅ | 2단계. 과목 선택 + 번호·이름·등급(상/중/하) 표, areas 없어도 등급 열 1개 표시 |
| /review | ✅ | 3단계. 평어 생성, **수정** 버튼으로 텍스트 편집, 복사 (다시 생성 버튼 제거) |
| 에러/환경 | ✅ | hasSupabaseEnv, .env.local 없을 때 안내 메시지 |
| UI/스타일 | ✅ | 헤더·네비, 카드, 버튼, 테이블, 상/중/하 select |
| 엑셀 다운로드 | ❌ | 미구현 |
| areas 초기 데이터 | ❌ | 수동 또는 별도 시드 필요 |

---

## 3. 라우팅·파일 위치

```
next-app/
├── src/app/
│   ├── page.tsx              # 메인 (1.학생명단 2.과목·등급 3.평어생성 링크)
│   ├── students/page.tsx      # 1단계: 학생 명단
│   ├── ratings/page.tsx       # 2단계: 과목 선택 + 등급(상/중/하) 테이블
│   └── review/page.tsx        # 3단계: 평어 표시·수정·복사
├── src/components/
│   └── AppNav.tsx             # 헤더 네비 (1.학생 명단, 2.과목·등급, 3.평어 생성)
├── src/lib/
│   ├── generator.ts           # deterministic 평어 생성 (핵심 로직)
│   ├── types.ts               # Level('1'|'2'|'3'), Area, Template, Student, Rating
│   └── supabase/client.ts     # createClient, hasSupabaseEnv
├── src/store/
│   ├── app-store.ts           # subject (국어/수학)
│   └── students-store.ts      # 학생 행 목록 (번호/이름)
├── src/styles/globals.css     # 앱 테마, 카드, 버튼, 테이블, review-item
├── supabase/migrations/
│   └── 20240216100000_rm_mvp_schema.sql
└── scripts/seed-templates.mjs
```

---

## 4. DB 스키마 (Supabase)

- **areas**: `id`(uuid), `subject`, `name`, `order_index` — 과목별 단원(영역).
- **templates**: `id`(uuid), `area_id`(FK areas), `level`('1'|'2'|'3'), `sentence`.
- **students**: `id`(uuid), `number`, `name`.
- **ratings**: `(student_id, area_id)` PK, `level`('1'|'2'|'3').

UI에서는 등급을 **상/중/하**로 표시 (1=상, 2=중, 3=하).

---

## 5. 평어 생성·리뷰 (generator.ts, /review)

- **순수 함수.** Math.random/LLM 미사용. `pickSentence`, `generateComment(areaLevels, templates, { studentId })`.
- **/review**: 학생별 생성 텍스트 표시. **수정** 버튼으로 textarea 편집 가능, **수정 완료**로 읽기 전용 전환. **복사**는 현재 표시 내용(수정 반영) 복사. (다시 생성 버튼 없음.)

---

## 6. 다음에 할 수 있는 작업

- [ ] **areas** 초기 데이터 시딩 (국어/수학 단원 이름·order_index).
- [ ] **엑셀 다운로드**: review 결과를 xlsx로 내보내기.
- [ ] npm 빌드 검증 (next.config·의존성 정리 후).

---

## 7. 참고

- **진행 이력**: MVP 단순화 → 스키마(areas/templates/students/ratings) → generator deterministic → 페이지 Supabase 연동 → UI(헤더·카드·테이블·상중하) → 순서(1.학생 2.과목·등급 3.평어) → 평어 수정 기능(다시생성 제거).
- **설정·에러**: `next-app/ERRORS_AND_SETUP.md`, `next-app/README.md`.
