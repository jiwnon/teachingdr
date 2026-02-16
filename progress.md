# ReportMate 진행 상황

## 목표

1학년 1학기 국어·수학 생활기록부 평어를 빠르게 작성하는 **엑셀 대체** 웹 앱.  
SaaS가 아닌 단일 세션 도구.

---

## 완료된 작업

### 1. MVP 단순화 (라우팅·개념 정리)

- **프로젝트 개념 제거**: 프로젝트 생성/편집 플로우 삭제
- **멀티테넌트·인증 제거**: Supabase auth 미사용, `src/lib/supabase/middleware.ts` 삭제
- **라우팅 단순화**:
  - 삭제: `/create`, `/project/[id]`
  - 적용 구조:
    ```
    /
    ├── students   # 학생 명단 입력
    ├── ratings    # 단원별 등급 입력
    └── review     # 결과 확인·다운로드
    ```

### 2. 데이터·상태

- **타입**: `Project`, `Student`, `Grade`, `Result` 제거. `Template`, `Level`, `SubjectCode`(국어/수학) 유지
- **스토어**: `project-store.ts` 제거 → `app-store.ts` (subject, studentNames, grades, setGrade)
- **DB**: `projects`, `students`, `grades`, `results` 테이블 제거. **templates**만 사용 (1학년 1학기 국어/수학). 학생·등급·결과는 앱 메모리만 사용

### 3. 평어 생성 로직 (deterministic)

- **generator.ts** 순수 함수로 재작성:
  - Math.random() / LLM 미사용. 템플릿 테이블에서만 문장 선택
  - seed = hash(studentId + areaId + level) + regenerateCount
  - index = seed % templates.length → 해당 템플릿 반환
  - `pickSentence()`, `generateComment(..., options: { studentId, regenerateCount? })` 제공

### 4. 문서

- **README.md** (next-app): MVP 범위, 라우팅, 사용 흐름, DB 스키마 정리

---

## 다음 작업 (예정)

- [ ] Supabase templates 실제 조회 연동 (review 페이지)
- [ ] 단원 목록을 DB/templates 기반으로 동적 로딩 (ratings 페이지)
- [ ] 엑셀 다운로드 (xlsx) 구현
- [ ] shadcn/ui + Tailwind UI 적용
- [ ] 1학년 1학기 국어/수학 템플릿 데이터 시딩
