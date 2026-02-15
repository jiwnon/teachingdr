# ReportMate

**프로젝트 이름**: ReportMate (리포트 메이트)

초등학교 선생님들이 생활기록부 평어를 빠르게 작성할 수 있는 웹 앱.  
학년/학기/과목 선택 → 평가 기준 템플릿 자동 제공 → 학생명·등급(상/중/하) 입력 → 평어 자동 생성.

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Backend**: Supabase (PostgreSQL)
- **UI**: shadcn/ui + Tailwind (설치 예정)
- **상태**: Zustand
- **엑셀**: xlsx (다운로드)
- **배포**: Cloudflare Pages

## MVP 범위

- 1학년 2학기 한정
- 과목: 국어-가, 국어-나, 수학, 통합(놀이/안전)
- 각 과목의 단원별 평가 기준을 DB(templates)에 저장

## 사용 흐름

1. 과목 선택 → 2. 학생 명단 입력(수동/엑셀 붙여넣기) → 3. 단원별 등급 테이블(행=학생, 열=단원, 상/중/하) → 4. 평어 생성 → 5. 결과 확인·복사·엑셀 다운로드

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인: 과목 선택
│   ├── create/page.tsx        # 프로젝트 생성
│   └── project/[id]/page.tsx  # 작업 페이지
├── components/
│   ├── SubjectSelector.tsx    # 과목 선택
│   ├── StudentInput.tsx       # 학생 명단 입력
│   ├── GradeTable.tsx         # 등급 입력 테이블
│   └── ResultViewer.tsx       # 결과 보기/다운로드
├── lib/
│   ├── supabase/              # client, server, middleware
│   ├── types.ts               # Template, Project, Student, Grade, Result
│   └── generator.ts           # 평어 생성 로직
└── store/
    └── project-store.ts       # Zustand
```

## DB 스키마 (Supabase)

- **templates**: id, grade, semester, subject, unit, level(상/중/하), sentence
- **projects**: id, teacher_name, grade, semester, subject, created_at
- **students**: id, project_id, name, order
- **grades**: id, student_id, unit, level (unique student_id+unit)
- **results**: id, student_id, generated_text, created_at

마이그레이션: `supabase/migrations/20240216000000_elementary_comment_schema.sql`

## 로컬 실행

1. `npm install`
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
3. `npm run dev`

## 참고 Skills

- next-best-practices, supabase-postgres-best-practices, vercel-react-best-practices, ui-ux-pro-max
