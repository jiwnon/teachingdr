# 에러 정리 & 필요 사항

## 1. 수정한 것

- **환경 변수 없을 때**: `/students`, `/ratings`, `/review` 접속 시 에러 메시지 표시  
  → `NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.`
- **Supabase API 에러**: 조회/저장 실패 시 `data.error.message` 표시.
- **네트워크 등 예외**: `.catch()`로 잡아서 화면에 메시지 표시.
- **`hasSupabaseEnv()`**: env 존재 여부만 확인하는 헬퍼 추가 (`src/lib/supabase/client.ts`).

## 2. 꼭 필요한 것

| 항목 | 설명 |
|------|------|
| **.env.local** | `next-app` 폴더에 생성. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 (Supabase 대시보드 → Project Settings → API). |
| **Supabase 마이그레이션** | `supabase/migrations/20240216100000_rm_mvp_schema.sql` 적용 (areas, templates, students, ratings 테이블 생성). |
| **areas 데이터** | `areas` 테이블에 국어/수학 단원 행이 있어야 `/ratings`, `/review`에서 열이 보임. 수동 insert 또는 별도 시드 스크립트 필요. |

## 3. 있으면 좋은 것

- **templates 시드**: `scripts/seed-templates.mjs`로 xlsx → templates insert. (areas가 먼저 있어야 함.)
- **학생 데이터**: `/students`에서 직접 입력 후 저장하면 됨.

## 4. 자주 나오는 에러

| 상황 | 원인 | 해결 |
|------|------|------|
| "NEXT_PUBLIC_SUPABASE_URL... 설정하세요" | .env.local 없음 또는 변수명/값 오타 | `.env.local` 생성 후 URL·anon key 입력, 서버 재시작 |
| "relation \"public.areas\" does not exist" | 마이그레이션 미적용 | Supabase에서 해당 migration 실행 |
| /ratings·/review에서 학생/영역 없음 | students·areas 테이블 비어 있음 | /students에서 학생 저장, areas 테이블에 단원 insert |
| "로드 실패" / 네트워크 에러 | Supabase URL·키 오류 또는 네트워크 | URL·키 확인, 브라우저 콘솔·네트워크 탭 확인 |

## 5. 실행 방법

```bash
cd next-app
# .env.local 설정 후
npm install
npm run dev
```

브라우저: **http://localhost:3000**
