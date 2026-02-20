# ReportMate — Cloudflare 배포 가이드

이 문서는 **Cloudflare Workers**에 Next.js 앱을 배포해 `npm run dev` 없이 항상 접속 가능한 URL로 서비스하는 방법입니다.  
추후 **앱(웹앱/PWA·네이티브 래핑)** 으로 서비스할 때도 같은 배포 URL을 그대로 사용할 수 있습니다.

---

## 1. 배포 방식 요약

- **런타임**: Cloudflare Workers (OpenNext 어댑터 사용)
- **빌드**: `opennextjs-cloudflare build` → Next.js 빌드 후 Workers용으로 변환
- **배포**: `npm run deploy:cf` 또는 GitHub 연동 자동 배포
- **접속 URL**: **https://report-mate.org** (커스텀 도메인. www.report-mate.org 도 사용 가능.)

---

## 1.1 URL 변경 (이미 적용: report-mate.org)

이 프로젝트는 **report-mate.org** 커스텀 도메인을 사용합니다. `wrangler.jsonc`에 `routes`(report-mate.org, www.report-mate.org)와 `workers_dev: false`가 설정되어 있어, 배포 시 해당 주소로만 접속됩니다.

다른 도메인을 쓰고 싶다면:

### 방법 A: workers.dev 서브도메인만 바꾸기 (도메인 구매 없음)

- **Cloudflare Dashboard** → [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
- 오른쪽 **Your subdomain** 옆 **Change** 클릭
- 원하는 서브도메인 입력 (예: `reportmate` → 주소는 `https://report-mate.reportmate.workers.dev`)

이렇게 하면 **아이디(alithya0707)는 안 나오고**, `report-mate.뭐뭐.workers.dev` 형태만 남습니다. 도메인 구매는 필요 없습니다.

### 방법 B: 다른 커스텀 도메인 추가

도메인을 구매한 뒤 Cloudflare에 zone 추가 → Worker **Settings** → **Domains & Routes** → **Add** → **Custom domain** 에서 연결. `wrangler.jsonc`의 `routes` 배열에 `{ "pattern": "도메인", "custom_domain": true }` 를 추가하면 배포 시 함께 적용됩니다.

---

## 2. 사전 준비 — 알려주셔야 할 것 / 직접 설정할 것

### 2.1 Cloudflare 계정

- [Cloudflare](https://dash.cloudflare.com/sign-up) 가입
- 터미널에서 **한 번만** 로그인: `npx wrangler login` (브라우저 인증)

### 2.2 환경 변수 (API 키·URL — 반드시 필요)

배포 후 앱이 동작하려면 아래 값을 설정해야 합니다. **로컬과 동일한 값**을 사용하면 됩니다.

| 변수명 | 설명 | 어디서 확인 |
|--------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명(공개) 키 | 위와 동일 |
| `OPENAI_API_KEY` | OpenAI API 키 (평어 GPT 재작성용) | [OpenAI API Keys](https://platform.openai.com/api-keys) |

- **비밀 키**: `OPENAI_API_KEY` 는 **절대** 코드·Git에 넣지 말고, 아래 3.2처럼 **Wrangler Secret** 또는 Dashboard에서만 설정하세요.
- **공개 변수**: `NEXT_PUBLIC_*` 는 빌드 시 프론트에 포함되므로, Git 연동 배포 시 Cloudflare 빌드 설정의 **Environment variables** 에 넣어 주세요.

---

## 3. 배포 방법

### 3.1 로컬에서 한 번에 배포 (CLI)

```bash
cd next-app

# 1) Cloudflare 로그인 (최초 1회)
npx wrangler login

# 2) 비밀 변수 설정 (최초 1회, 값은 직접 입력)
npx wrangler secret put OPENAI_API_KEY

# 3) 공개 변수는 wrangler.jsonc 의 vars 또는 Dashboard에서 설정 (아래 3.2 참고)

# 4) 빌드 + 배포
npm run deploy:cf
```

배포가 끝나면 터미널에 **접속 URL**이 출력됩니다.

### 3.2 환경 변수 설정 (Cloudflare Dashboard)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. **report-mate** Worker 선택
3. **Settings** → **Variables and Secrets**
   - **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가 (빌드/런타임 모두 사용 시 둘 다 설정)
   - **Encrypted (Secret)**: `OPENAI_API_KEY` 추가

Git 연동 배포를 쓰는 경우, **Workers & Pages** → 해당 프로젝트 → **Settings** → **Build** 에서  
**Build environment variables** 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 넣어 두면 빌드 시 적용됩니다.

### 3.3 GitHub 연동 자동 배포 (선택)

1. Dashboard → **Workers & Pages** → **Create** → **Connect to Git**
2. 저장소 선택 후 **Build settings**:
   - **Framework preset**: None
   - **Build command**: `cd next-app && npm ci && npm run deploy:cf`  
     (또는 저장소 루트가 next-app 이면: `npm ci && npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`)
   - **Build output**: OpenNext가 Worker로 배포하므로 “Worker” 방식으로 생성된 프로젝트면 별도 output 디렉터리 없음
3. **Environment variables** 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
4. **Secrets** 에 `OPENAI_API_KEY` 설정

저장소가 **루트가 next-app** 이 아닌 경우, 빌드 명령에서 `cd next-app` 을 포함해 주세요.

---

## 4. 로컬에서 배포 결과 미리보기

배포 전에 Workers 환경과 비슷하게 로컬에서 실행해 보려면:

```bash
cd next-app
npm run preview
```

(필요 시 `.dev.vars` 에 `NEXTJS_ENV=development` 등 로컬용 변수 추가 가능)

---

## 5. 추후 “앱”으로 서비스할 때

- **같은 배포 URL**을 그대로 사용할 수 있습니다.
- **PWA / “홈 화면에 추가”**: 배포된 URL은 HTTPS이므로, 필요 시 `manifest.json`·서비스 워커만 보완하면 PWA로 사용 가능합니다.
- **네이티브 앱 래핑**: Capacious, Ionic, React Native WebView 등에서 **배포된 URL**을 로드하는 방식으로 앱을 만들 수 있습니다.  
  별도 “앱 전용 배포”는 필요 없고, 지금의 Cloudflare 배포 하나로 웹·앱 모두 대응 가능합니다.

---

## 6. 문제 해결

- **빌드 실패**: `next-app` 에서 `npm run build` 가 성공하는지 먼저 확인. 실패하면 Next/React 관련 오류를 먼저 해결.
- **배포 후 404**: Worker 이름·도메인 확인. 첫 배포 후 1–2분 지연될 수 있음.
- **Supabase/OpenAI 오류**: Dashboard의 **Variables and Secrets** 에 값이 들어 있는지, 변수명 오타가 없는지 확인.
- **Wrangler 버전**: `npx wrangler --version` 이 3.99 이상인지 확인 (OpenNext 권장).

---

## 7. 참고

- OpenNext Cloudflare: [opennext.js.org/cloudflare](https://opennext.js.org/cloudflare)
- Wrangler: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler)
- **Cursor Agent**: 배포·키 설정 시 `next-app/.secrets.local.md`(Git 제외)를 참고할 수 있습니다. 해당 파일에 Supabase/OpenAI 키와 배포 URL이 정리되어 있습니다.
