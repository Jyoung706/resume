# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ORKIS Frontend — React 19 + MUI 7 + TypeScript 5.9 기반의 **프로덕션 급 사용자 인터페이스**.
CSS 변수 기반 테마 시스템으로 light/dark/auto 모드를 지원하며, MUI 컴포넌트를 래핑하여 "Convenience Props" 패턴을 적용한 커스텀 컴포넌트 라이브러리.

> **마이그레이션 이력 (2026-05-07)**: 본 저장소는 `orkis-front-design` (브랜치 `feat/re`, HEAD `bbb0c7d`)을 베이스로 전환되었습니다.
> 이전 아키텍처는 [CLAUDE.legacy.md](./CLAUDE.legacy.md) 참조.
> 마이그레이션 plan: [orkis-other/docs/2026-05-07/orkis-front-design-to-front-migration-execution-plan-v4.md](../../../orkis-other/docs/2026-05-07/orkis-front-design-to-front-migration-execution-plan-v4.md)

### 프로덕션 아키텍처 — Design ↔ Logic 분리

```
src/
├── components/          (Design 레이어 — props-only, 상태관리를 모름)
│   ├── base/            MUI 1:1 래핑 (ConvenienceProps + forwardRef + clsx)
│   ├── ui/              복합 조합 컴포넌트
│   ├── domain/          도메인 특화 컴포넌트
│   └── layout/          페이지 구성 유틸리티
│
├── connectors/          (접착제 — Logic ↔ Design 매핑, 얇게 유지)
│
├── logic/               (Logic 레이어 — 비즈니스 로직, 상태관리 책임)
│   ├── stores/          Zustand 스토어 (persist 미들웨어 적용 가능)
│   ├── hooks/           스토어 조합, 비즈니스 로직 훅
│   └── services/        API 호출
│
├── design-system/       (디자인 시스템 — 공통 시각 자산)
├── themes/              (테마 정의 — light/dark/orkis 등)
├── layouts/             (레이아웃)
├── router/              (라우터)
└── pages/               (페이지 — Design 컴포넌트 조합)
```

**원칙:**
- **Design 컴포넌트는 순수**: props만 받고, 스토어/persist/localStorage를 직접 참조하지 않는다
- **Logic 스토어가 상태 책임**: persist, 캐싱, 서버 동기화는 `logic/stores/`에서 처리한다
- **Connector는 얇게**: 스토어 → props 매핑만 담당. 비즈니스 로직을 넣지 않는다

### 1:1:1 매핑 규칙 (pages ↔ connectors ↔ logic)

```
pages/{feature}/{Page}.tsx              ← Design Layer (props-only)
connectors/{feature}/{Page}Connector.tsx ← Glue Layer (훅 호출 → props 매핑)
logic/{feature}/{useHook}.ts            ← Logic Layer (스토어/서비스 조합)
```

- 커넥터는 **자신이 렌더링하는 페이지에 필요한 훅만** 소유한다
- 커넥터 파일명에서 페이지 파일명을 **즉시 유추**할 수 있어야 한다
- pages/ 파일은 `@/logic`에서 **타입만** import 가능 (값/함수 import 금지)
- 한 커넥터의 훅 소유 수: **이상적 1~3개, 최대 5개**
- 과부하 커넥터는 composite hook으로 추출하여 훅 수를 줄인다
- 각 패널의 `index.ts`에서 `Connector as Panel` re-export 패턴 사용

## Commands

```bash
yarn dev          # Vite 개발 서버 실행 (port 5173)
yarn dev:ag       # Agentation 디버깅 모드 포함 개발 서버 (VITE_ENABLE_AGENTATION=true)
yarn build        # tsc -b && vite build (타입 체크 + 빌드)
yarn lint         # ESLint 실행
yarn lint:fix     # ESLint 자동 수정
yarn preview      # 빌드 결과 미리보기

# Docker (운영/개발)
yarn docker:build         # docker-compose 빌드
yarn docker:run           # docker-compose up -d
yarn docker:dev:build     # 개발 이미지 빌드 (Dockerfile.dev)
yarn docker:dev:run       # 개발 컨테이너 기동
```

## Architecture

### 테마 시스템 (CSS 변수 ↔ MUI 브릿지)

스타일링의 핵심은 **SCSS CSS 변수 → MUI 테마 브릿지** 패턴:

1. `src/themes/{theme}/config/_custom-tokens.scss` — alias 토큰 정의
2. `src/themes/{theme}/_theme-{theme}.scss` — 테마 진입점
3. `src/themes/_default.scss` — 테마 무관 공통 토큰을 CSS 변수(`--spacing`, `--radius-*`, `--text-*` 등)로 선언 (:root)
4. CSS 변수 → MUI palette 브릿지 (`getComputedStyle`로 CSS 변수 읽기)
5. `ThemeModeProvider` — `MuiThemeProvider` + `CssBaseline` 래핑

#### 토큰 3계층 구조 (참조 우선순위)

```
[L1] global   --global-{group}-{shade}       — 테마별 원시 색 팔레트 (참조 금지, alias 정의에서만 사용)
              예: --global-yellowGray-100, --global-orange-400
              정의: src/themes/{theme}/config/_custom-tokens.scss

[L2] alias    --alias-{domain|component}-{property}  — 시맨틱 추상화 ★ 페이지/컴포넌트 SCSS 1순위 ★
              예: --alias-main-bg, --alias-top-bg, --alias-chatting-bg,
                  --alias-database-text, --alias-searchbox-border,
                  --alias-btn-icon, --alias-accordion-bg, --alias-process-success
              정의: src/themes/orkis/config/_custom-tokens.scss (orkis 테마에 약 400개)

[L2'] base    --bg-paper, --text-color, --primary, --border-color, --text-muted ...
              테마-aware 공통 토큰. alias에 적합한 항목이 없을 때 사용.

[L3] page-scoped --{scope}-{property}        — 한 디렉토리 내부에서만 쓰는 시맨틱
              예: --panel-bg (chat panels)
              정의: pages/{area}/{...}.scss 의 :root
              사용처: 같은 디렉토리 내 SCSS 만
```

**SCSS 작성 시 원칙:**
- **alias 토큰을 1순위로 사용**한다. 적합한 alias가 이미 있는데 base 토큰을 직접 쓰지 말 것.
- **디자인 테마 정의(`themes/orkis/`) 자체는 수정하지 않는다.** 신규 의미가 필요하면 별도 PR로 alias 토큰을 추가하고, 페이지/컴포넌트 SCSS는 그 토큰을 **참조만** 한다.
- **리터럴 hex/px 직접 사용 금지.** `#F7F6F0`를 적기 전에 `--alias-main-bg`를 먼저 찾는다.
- **L3 page-scoped 토큰**은 한 영역(예: chat panels)에서 일괄 변경하고 싶고 alias 추가까지는 과한 경우에만 사용한다.

### 컴포넌트 계층 및 제작 기준

```
src/components/
├── base/     — MUI 래핑 기본 컴포넌트
├── layout/   — 레이아웃 전용 컴포넌트
├── ui/       — 복합 UI 컴포넌트
└── domain/   — 도메인 특화 컴포넌트
```

| 디렉토리 | 기준 | import 대상 | 예시 |
|----------|------|------------|------|
| **base/** | MUI 컴포넌트를 1:1 래핑. sx 없이 props만으로 MUI 스타일링이 가능하도록 ConvenienceProps 패턴 적용. **MUI를 직접 import할 수 있는 유일한 계층** | MUI 컴포넌트 직접 import | Button, Input, Paper, Form, Box, Typography |
| **ui/** | base 컴포넌트를 import하여 구성. 두 개 이상의 base 컴포넌트를 조합하거나, 기능적으로 변형된 복합 컴포넌트 | base/, layout/ 컴포넌트만 | Modal, Toast, SearchInput, PasswordInput, Accordion |
| **domain/** | 특정 화면/도메인에서만 사용되는 컴포넌트. 공통 재사용이 보장되지 않음 | base/, layout/, ui/ 컴포넌트만 | PricingCard, BillingToggle, ContactBar |
| **layout/** | 페이지 제작 및 디자인 레이아웃 구성을 위한 컴포넌트. base/ 컴포넌트를 조합하여 레이아웃 특화 convenience를 추가. 다른 모든 계층에서 자유롭게 사용 | base/ 컴포넌트만 | FlexBox |

**MUI 직접 import 규칙 (핵심):**

> **base/만 MUI를 직접 import할 수 있다.** layout/, ui/, domain/에서 MUI 컴포넌트가 필요하면 반드시 base/에 래핑 컴포넌트를 먼저 만든 후 그것을 import하여 사용한다.
>
> **예외:** `@mui/icons-material` 아이콘과 `@mui/material/styles`의 타입(`SxProps`, `Theme` 등)은 어디서든 직접 import 허용.

**의존 구조:**

```
  MUI (직접 import는 base/만 허용)
   ↓
  base/ (MUI 래핑 기반, 유일한 MUI 접점)
   ↓
  layout/ (base/ import, 페이지 구성 유틸, 어디서든 사용 가능)
  ui/     (base/ import, 복합 구성)
   ↓
  domain/ (base/, layout/, ui/ import)
```

- base/ → ui/ → domain/ 방향의 역방향 의존은 금지한다
- layout/은 페이지 구성 유틸리티로, 계층에 구애받지 않고 어디서든 import 가능하다

**제작 규칙:**
- base/ 컴포넌트는 반드시 `forwardRef` + `clsx("ok-{name}")` + ConvenienceProps 분리 패턴을 따른다
- 각 컴포넌트 디렉토리에 `Component.tsx` + `index.ts` (barrel export) 구성
- 새 MUI 컴포넌트가 필요하면 반드시 base/에 래핑 컴포넌트를 먼저 만든 후 사용한다

### Modal vs Dialog 시맨틱 분류

팝업 컴포넌트는 **목적에 따라 Modal과 Dialog를 명확히 구분**한다.

| 분류 | 용도 | 컴포넌트 | 비고 |
|---|---|---|---|
| **Modal** | 단순 확인/경고/위험 (alert/confirm/error) | `Modal`, `ConfirmModal`, `ErrorModal` | 결정 강제, ARIA `alertdialog`에 가까움 |
| **Dialog** | 정보 입력/조회 (느긋한 상호작용) | `Dialog` | 헤더/콘텐츠/푸터 슬롯 보유, 폼·뷰어 등 |

**계층 매핑:**
- `components/base/Dialog/` — MUI Dialog 1:1 래퍼
- `components/ui/Dialog/` — 헤더(title+subtitle+close)·콘텐츠·푸터·바텀 슬롯 구조
- `components/ui/Modal/` — alert/confirm/error 용도의 표준 모달
- `components/ui/ConfirmModal/` — 확인/취소 표준 패턴
- `components/ui/ErrorModal/` — 에러 알림 표준

### Convenience Props 패턴

MUI 컴포넌트를 래핑할 때 두 가지 convenience props 전략 사용:

- **`ConvenienceProps`** — spacing, size, color, visual props를 받아 `convenienceToSx()`로 sx 객체 변환
- **`VisualConvenienceProps`** (Box, Stack, Typography) — `rounded`, `shadow`만 추가

컴포넌트 패턴: `splitConvenienceProps(props)` → `convenienceToSx(convProps)` → `mergeSx(convSx, userSx)` → MUI 컴포넌트에 전달.

### 라우팅

`src/router/` — `createBrowserRouter` 기반.
- `MainLayout` — 사이드바 + 헤더 + Outlet
- 인증 가드: `AuthGuard`, `GuestGuard`
- OAuth 콜백: `/auth/callback` (Google/Naver/Kakao 공통)

### 전역 상태

- **테마 모드**: `ThemeModeContext` + `useThemeModeContext()` (light/dark/auto, localStorage 저장: `orkis-theme-mode`)
- **토스트**: `ToastProvider` + `useToast()` (전역 알림)

### 채팅 시스템 (SSE)

- **실시간 채팅**: Fetch Streaming (SSE) 기반 (`POST /api/sse/chat/stream`)
- **AbortController** 기반 취소 관리
- nginx `/api/` 프록시는 `proxy_buffering off` + 300s timeout으로 SSE 장시간 연결 유지

### Pro 모드

`pages/pro/`, `connectors/pro/`, `logic/common/pro/` — SQL Tool + Pro 모드 워크스페이스.
일반 채팅 전체 기능 포함 + SQL tool 확장. 기능 축소 금지 (운영 정책).

## Design Principles

1. **MUI 직접 import는 base/만 허용** — 새로운 MUI 컴포넌트가 필요하면 반드시 base/에 래핑 컴포넌트를 먼저 만든다. **예외: `@mui/icons-material` 아이콘과 `@mui/material/styles` 타입은 직접 import 허용.**
2. **sx prop은 컴포넌트 내부에서만** — 페이지/레이아웃에서 `sx`로 스타일링하지 않는다.
3. **색상/사이즈는 테마 변수 사용 — orkis 테마의 `--alias-*` 토큰 우선**:
   - **(1순위) `--alias-*` 토큰** — orkis 테마는 약 400개의 시맨틱 alias 토큰을 정의해 두었다.
   - **(2순위) base 테마-aware 토큰** — `--bg-paper`, `--text-color`, `--border-color` 등.
   - **(3순위) 유틸리티 스케일 토큰** — `--space-*`, `--radius-*`, `--text-*` 등.
   - **(금지) 리터럴 값 직접 사용** — `#fff`, `16px` 같은 hex/숫자 리터럴 금지.
   - **(정책) 디자인 테마는 수정 금지** — `src/themes/orkis/`의 정의 자체를 임의로 바꾸지 않는다. 새 의미가 필요하면 별도 alias 토큰 추가 PR로 처리.
4. **하드코딩 금지, MUI 폴백 보장** — 모든 스타일 값은 CSS 변수/테마 토큰으로 추상화한다. `var(--alias-xxx, #fallback)` 형태의 hex fallback은 폴백 보장 목적으로만 허용.
5. **Box 사용 최소화** — `FlexBox`, `Stack`, `Container`, `Paper` 등 의미에 맞는 대체 컴포넌트 우선.
6. **className 컨벤션 — PascalCase BEM이 표준** — 모든 컴포넌트/페이지의 className은 `{ComponentName}__{element}` (필요 시 `--{modifier}`) 형태의 PascalCase BEM.
   - className prop을 받는 컴포넌트는 항상 `clsx("고유클래스", className)` 형태로 병합.
   - 동적 modifier는 `clsx("Component__el", condition && "Component__el--active")` 패턴.
   - **`ok-*` 접두사는 부가적**. base/ui/layout 같은 라이브러리 계층 일부에 역사적으로 부여되어 있으나 신규 코드에서 강제하지 않는다.
7. **페이지에서 `style`/`sx` prop 사용 금지** — ConvenienceProps 또는 SCSS/CSS 변수로 처리. 필요한 ConvenienceProps 프리셋이 없으면 `types.ts`에 프리셋 추가.
8. **`<img>` 직접 사용 금지** — base/Img 컴포넌트 사용.
9. **통일 컴포넌트 우선 사용** — 신규 마크업 작성 전 아래 표를 먼저 확인. 동일 의미 UI는 표준 컴포넌트로 작성한다.

   | 의미 | 표준 컴포넌트 |
   |---|---|
   | 로딩 스피너 (인라인) | `base/CircularProgress` (size: `xsmall`/`small`/`medium`/`large`/`xlarge`) |
   | 로딩 (페이지 전체) | `ui/PageLoading` |
   | 빈 상태/플레이스홀더 | `ui/EmptyState` |
   | 폼 라벨+에러+도움말 | `ui/FormField` 또는 `base/Input`의 `label`/`error` prop |
   | 패널 헤더 (title + actions) | `ui/PanelHeader` |
   | Auth 폼 카드 | `domain/auth/AuthCard` |
   | 확인/경고 모달 | `ui/ConfirmModal`, `ui/AlertModal`, `ui/ErrorModal` |
   | 정보 입력 다이얼로그 | `ui/Dialog` |
   | 글로벌 헤더 (AppBar+Toolbar) | `ui/AppHeader` |

10. **Paper variant 영역별 정책** — `base/Paper`의 elevation 기본값은 **0** (MUI 기본 1 오버라이드). 영역별 명시:

    | 영역 | variant | elevation |
    |---|---|---|
    | Auth 카드 | default | `0` (그림자 없음) |
    | Menu paper (MUI Menu 내부) | (Menu 컴포넌트 자체 관리) | (MUI Menu 8 기본) |
    | Settings 영역 카드 | `outlined` | — |
    | 채팅 입력 | default | `0` (명시) |

11. **CircularProgress 사이즈 표기** — `size="xsmall|small|medium|large|xlarge"` (ComponentSize 문자열) **표준**.
    - SCSS 정의는 **`--alias-circular-progress-size-{size}` 토큰** 참조 (리터럴 rem 금지).
    - 매핑: xsmall=`1rem` / small=`1.25rem` / medium=`1.5rem` / large=`2rem` / xlarge=`3rem`.
    - 숫자/rem 리터럴 문자열 사용 금지 (특수 케이스만 허용, PR 설명 필수).

12. **import 패턴 — `@/components` barrel 표준**.
    - `@/components/{base,ui,layout,domain}` 분리 import는 금지 (barrel 미노출 컴포넌트만 예외).
    - 같은 파일에서 같은 출처(`@/components`)의 import는 한 줄로 통합.
    - 예외 (서브패스 허용): `@/components/ui/ErrorFallback`(barrel 노출되나 명시 사용 가능), `@/components/domain/ChatMessage/SqlProcessSteps`(sub-component) 등.

13. **신규 컴포넌트의 SCSS 토큰 정책** — 시각 정의 우선순위:
    1. **(1순위) 적합한 `--alias-*` 토큰** — 이미 정의된 토큰 우선 참조.
    2. **(2순위) `--alias-*` 토큰 신설** — orkis 테마 `_custom-tokens.scss`에 `alias-{component-kebab}-{property}-{size?}` 패턴으로 추가 후 참조.
    3. **(3순위) `--component-size-*` / `--font-size-*` / `--icon-size-*`** 등 base 토큰.
    4. **(금지) 리터럴 hex/rem/px 직접 사용** — PR 반려 사유.

    신규 alias 토큰 명명 규칙: `alias-{component-kebab}-{property}-{size?}`
    - 예: `alias-panel-header-padding`, `alias-circular-progress-size-medium`

## Key Conventions

- **경로 alias**: `@/` → `src/` (vite.config.ts, tsconfig.app.json 모두 설정)
- **SCSS**: 모든 SCSS 파일에 `@use "@/styles/abstracts" as *;` 자동 주입
- **CSS Modules**: camelCase 변환 활성화 (`localsConvention: "camelCase"`)
- **React Compiler**: `babel-plugin-react-compiler` 활성화 (자동 메모이제이션, RC 단계)
- **barrel export**: 각 컴포넌트 디렉토리에 `index.ts` 파일로 named export
- **컴포넌트 className**: PascalCase BEM 표준 (`{ComponentName}__{element}`)
- **Prettier**: 세미콜론 O, 쌍따옴표, trailing comma 없음, 80자 줄바꿈
- **패키지 관리자**: Yarn Berry 4.9.4 (`.yarnrc.yml` 존재)
- **배포**: Docker (nginx) + Kubernetes (`k8s/`), Jenkins CI/CD
- **이모지 정책**: design 베이스 채택. 무분별한 이모지 사용은 지양하되 design source가 사용한 위치는 보존 (legacy CLAUDE.md의 "STRICTLY NO EMOJIS" 정책에서 완화 — D11)

## Build & Deployment

### 환경 변수

| 변수 | 기본값 | 용도 |
|------|------|------|
| `VITE_API_BASE` | `/api` | Backend API 기본 경로 |
| `VITE_ENABLE_AGENTATION` | `false` | Agentation 디버깅 활성화 (운영 비활성) |

### 빌드 모드

- **개발**: `yarn dev` (vite.config.ts, esbuild minify)
- **프로덕션 (단순)**: `yarn build` (tsc 타입 체크 + vite build)
- **프로덕션 (Docker)**: `vite.config.docker.ts` (`minify: false` for Emotion CSS 처리)

### Vite manualChunks 정책

design 구조 기반 8개 청크:
- vendor: `react-vendor`, `mui-vendor`, `editor-vendor` (dockview + monaco)
- source: `logic`, `connectors`, `design-system`, `themes`, `components`

### Docker

- `Dockerfile` — 운영 빌드 (multi-stage: node 24-alpine → nginx stable-alpine)
- `Dockerfile.dev` — 개발 빌드 (vite dev 서버 + HMR)
- `nginx/orkis.conf` — K8s 운영 nginx (kube-dns resolver, `/api/` SSE 프록시, `Authorization`/`Cookie` 헤더 전달)

### 보존 자산 (마이그레이션 v4 결정)

- `orkis-interface/` 디렉토리 — `orkis-desktop`이 path alias로 참조 (Q1-A 보존). front 자체는 미사용 (design은 자체 타입)
- `.gitmodules` — orkis-interface 서브모듈 정의 보존

## Migration Notes (2026-05-07)

본 저장소는 `orkis-front-design` (브랜치 `feat/re`, HEAD `bbb0c7d`)을 베이스로 마이그레이션됨.

### 의도적 정책 변경 (마이그레이션 v4)

| 결정 | 의미 |
|------|------|
| **D1** | nginx `/ws` 블록 제거 (design 미사용) |
| **D2** | `VITE_API_URL`, `VITE_WS_URL`, `VITE_INACTIVITY_*` 제거 (design 미참조) |
| **D3** | nginx `X-Session-ID` forward 제거 (backend 미사용 확정) |
| **D4** | `package.json#name` `orkis-front-new` → `orkis-front` 통일 (K8s `APP_NAME` 정합) |
| **D6** | front Legacy CLAUDE.md "Props 절대 보존" 원칙 의도적 무효화 (design 아키텍처로 전환) |
| **D8** | Performance gate ±20% (Legacy "50%"보다 엄격) |
| **D10** | `orkis-interface/` 디렉토리 보존 (orkis-desktop dependency, Q1-A) |
| **D11** | 이모지 정책 design 기준 완화 (Q2-B) |
| **D12** | `VITE_ENABLE_AGENTATION=false` Dockerfile 명시 (Q3-C) |

### 폐기된 기능 (Non-goals)

다음 기능은 본 마이그레이션에서 함께 폐기됨. 필요 시 후속 PR로 처리:
- IndexedDB 채팅 캐시 (chatHistoryService)
- inactivity logout (`VITE_INACTIVITY_*`)
- MSW Mock 인프라
- Vitest 단위 테스트 인프라
- 모바일 `mo-style.css` 분기 (1280px 분기)
- WebSocket(`/ws`) 클라이언트
- 자동화 E2E 테스트

### 후속 PR 트래킹

- design 저장소 cleanup PR (yarn lint 162 errors, yarn build 미사용 import 7개, ResetPasswordPage.scss mixin 오타)
- Performance baseline 운영 환경 측정 (Web Vitals)
- 자동화 E2E 테스트 도입 (Playwright)
