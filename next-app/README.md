# 성적도우미 (Grade Helper)

엑셀 기반 문장 생성 및 성적 관리 PWA.  
**설정과 뼈대는 아래 skills 베스트 프랙티스를 반영했습니다.**

## 참고한 Skills

| 구분 | 스킬 | 적용 내용 |
|------|------|-----------|
| 필수 | next-best-practices | App Router 파일 규칙, layout/page/loading/error/not-found/global-error, metadata·viewport, data-patterns, middleware |
| 필수 | supabase-postgres-best-practices | 스키마 소문자 snake_case, bigint identity PK, timestamptz/text, FK 인덱스, RLS 주석 정책 |
| 필수 | vercel-react-best-practices | (구현 시) 컴포넌트/훅 패턴 참고 |
| 필수 | ui-ux-pro-max | 터치 44px, 포커스 링, globals.css |
| 추가 | next-cache-components | Next 16+ use cache 시 참고 (현재 14) |
| 추가 | web-design-guidelines | 접근성·웹 가이드라인 |
| 추가 | wrangler | wrangler.toml / wrangler.jsonc, compatibility_date, pages deploy |
| 추가 | cloudflare | Pages 배포, 환경변수 |

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript  
- **Backend**: Supabase (PostgreSQL, Auth, Storage)  
- **배포**: Cloudflare Pages (정적 export)  
- **앱**: PWA (웹/모바일)

## 프로젝트 구조 (next-best-practices)

```
next-app/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # 루트 레이아웃, metadata/viewport
│   │   ├── page.tsx
│   │   ├── loading.tsx         # Suspense fallback
│   │   ├── error.tsx            # Client Component
│   │   ├── not-found.tsx
│   │   └── global-error.tsx    # root 에러, html/body 포함
│   ├── components/
│   ├── lib/
│   │   ├── supabase/           # client, server, middleware
│   │   ├── utils/
│   │   └── hooks/
│   ├── types/
│   └── styles/globals.css
├── public/
│   ├── manifest.json
│   └── icons/
├── supabase/
│   ├── config.toml
│   └── migrations/             # BP 반영 스키마
├── next.config.js              # PWA 래핑
├── wrangler.toml               # Cloudflare Pages
├── wrangler.jsonc              # wrangler 스킬 권장
└── .env.example
```

## 로컬 실행

1. `npm install`
2. `.env.example` → `.env.local` 에 Supabase URL/Anon Key 입력
3. `npm run dev` → http://localhost:3000

## Supabase

- 마이그레이션: `supabase db push` 또는 대시보드 SQL Editor에서 `migrations/` SQL 실행
- 타입 생성: `supabase gen types typescript --project-id <id> > src/types/database.gen.ts`

## PWA

- `public/manifest.json`, `next.config.js` PWA 플러그인 설정됨
- `public/icons/` 에 72~512px 아이콘 추가

## Cloudflare Pages 배포

1. `next.config.js` 에 `output: 'export'` 주석 해제 후 `npm run build` → `out/` 생성
2. `npx wrangler pages deploy ./out --project-name=grade-helper`
3. Dashboard에서 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정

## 핵심 기능 플로우 (구현 예정)

1. 사용자 인증 (선택, 비회원 가능)  
2. 엑셀 업로드 → Supabase Storage  
3. 파싱 → DB (templates, students, projects)  
4. 문장 생성 → results 저장  
5. 결과 다운로드/공유  
