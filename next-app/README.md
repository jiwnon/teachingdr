# ReportMate

**1학년 1학기 국어·수학** 생활기록부 평어를 빠르게 작성하는 **엑셀 대체** 웹 앱.  
과목 선택 → 학생 명단 입력 → 단원별 등급(상/중/하) 입력 → 평어 자동 생성 → 결과 확인·엑셀 다운로드.

- **MVP**: 프로젝트/멀티테넌트/인증 없음. 단일 세션 도구.
- **SaaS가 아님**: 로컬에서 한 반·한 과목씩 사용.

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Backend**: Supabase (PostgreSQL, templates만 사용)
- **UI**: shadcn/ui + Tailwind (설정 예정)
- **상태**: Zustand
- **엑셀**: xlsx (다운로드)
- **배포**: Cloudflare Pages

## 라우팅

```
/
├── students   # 학생 명단 입력
├── ratings    # 단원별 등급 입력
└── review     # 결과 확인·다운로드
```

## 사용 흐름

1. **/** → 시작
2. **/students** → 과목 선택(국어/수학), 학생 명단 입력(한 줄에 한 명 또는 엑셀 붙여넣기)
3. **/ratings** → 단원별 등급 테이블(행=학생, 열=단원, 상/중/하)
4. **/review** → 평어 생성 결과 확인, 복사, 엑셀 다운로드

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx           # 메인
│   ├── students/page.tsx   # 학생 명단
│   ├── ratings/page.tsx    # 등급 입력
│   └── review/page.tsx     # 결과 확인
├── components/
│   ├── SubjectSelector.tsx
│   ├── StudentInput.tsx
│   ├── GradeTable.tsx
│   └── ResultViewer.tsx
├── store/
│   └── app-store.ts        # Zustand (subject, studentNames, grades)
├── lib/
│   ├── supabase/           # client, server (templates 조회용)
│   ├── types.ts            # Template, Level, SubjectCode
│   └── generator.ts        # 평어 생성 로직
└── styles/
```

## DB (Supabase)

- **templates**만 사용: id, grade, semester, subject, unit, level(상/중/하), sentence  
  - MVP: 1학년(grade=1), 1학기(semester=1), subject = '국어' | '수학'
- 학생·등급·결과는 DB에 저장하지 않고 앱 상태(메모리)로만 처리.

마이그레이션: `supabase/migrations/20240216000000_elementary_comment_schema.sql`

## 로컬 실행

1. `npm install`
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
3. `npm run dev`
