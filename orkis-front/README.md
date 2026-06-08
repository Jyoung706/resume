# Orkis Frontend

ORKIS UI Framework — React 19 + MUI 7 + TypeScript 기반의 프로덕션 급 사용자 인터페이스.

> **마이그레이션 이력 (2026-05-07)**: 본 저장소는 `orkis-front-design` (브랜치 `feat/re`, HEAD `bbb0c7d`) 베이스로 전환되었습니다.
> 상세: [CLAUDE.md](./CLAUDE.md), 이전 아키텍처: [CLAUDE.legacy.md](./CLAUDE.legacy.md)

## 기술 스택

- **Framework**: React 19 + TypeScript 5.9
- **UI**: MUI 7 (Material UI v7) + Emotion
- **Build**: Vite 7 + babel-plugin-react-compiler (RC)
- **State**: Zustand 5
- **Router**: React Router v7
- **Editor**: Monaco (`@monaco-editor/react`) + Dockview React
- **Markdown**: react-markdown + remark-gfm + DOMPurify
- **Package Manager**: Yarn Berry 4.9.4

## 아키텍처 — Design ↔ Logic 분리

```
src/
├── components/      Design 레이어 (props-only)
│   ├── base/        MUI 1:1 래핑 (ConvenienceProps 패턴)
│   ├── ui/          복합 조합 컴포넌트
│   ├── domain/      도메인 특화 컴포넌트
│   └── layout/      페이지 구성 유틸리티
├── connectors/      Logic ↔ Design 매핑 (얇게)
├── logic/           비즈니스 로직 + 상태 관리
│   ├── stores/      Zustand 스토어
│   ├── hooks/       비즈니스 훅
│   └── services/    API 호출
├── design-system/   디자인 시스템
├── themes/          테마 정의 (orkis/light/dark/auto)
├── layouts/         페이지 레이아웃
├── router/          라우팅
└── pages/           페이지 (Design 컴포넌트 조합)
```

상세: [CLAUDE.md](./CLAUDE.md)

## 시작하기

### 사전 요구사항

- Node.js 20.x 이상 (운영 빌드는 24.x)
- Yarn Berry 4.9.4 (Corepack)

### 설치

```bash
corepack enable
yarn install
```

### 환경 변수

`.env.local` 또는 운영 ConfigMap에 다음 설정:

| 변수 | 기본값 | 용도 |
|------|------|------|
| `VITE_API_BASE` | `/api` | Backend API 경로 |
| `VITE_ENABLE_AGENTATION` | `false` | Agentation 디버깅 (운영 비활성) |

### 명령어

```bash
yarn dev          # Vite 개발 서버 (http://localhost:5173)
yarn dev:ag       # Agentation 디버깅 모드
yarn build        # 프로덕션 빌드 (tsc -b && vite build)
yarn lint         # ESLint
yarn lint:fix     # ESLint 자동 수정
yarn preview      # 빌드 미리보기

# Docker
yarn docker:build         # docker-compose 빌드
yarn docker:run           # docker-compose up -d
yarn docker:dev:build     # 개발 이미지 (Dockerfile.dev)
yarn docker:dev:run       # 개발 컨테이너
```

## 빌드 모드

| 모드 | 설정 | minify | 용도 |
|------|------|------|------|
| dev | `vite.config.ts` | (dev) | 로컬 개발 (HMR) |
| 일반 빌드 | `vite.config.ts` | esbuild | yarn build |
| Docker 빌드 | `vite.config.docker.ts` | **false** (Emotion CSS 처리) | 운영 컨테이너 |

### manualChunks 정책

design 구조 기반 8개 청크:
- `react-vendor`, `mui-vendor`, `editor-vendor` (vendor)
- `logic`, `connectors`, `design-system`, `themes`, `components` (source)

## 주요 기능

- **인증**: ID/PW + OAuth (Google/Naver/Kakao). 콜백 라우트: `/auth/callback`
- **채팅**: SSE 기반 실시간 스트리밍 (`POST /api/sse/chat/stream`)
- **Pro 모드**: SQL Tool + 워크스페이스 (Dockview 패널 + Monaco 에디터)
- **테마**: orkis 테마 + light/dark/auto 모드 (CSS 변수 + alias 토큰 약 400개)

## API 프록시

- 개발: `/api` → `http://localhost:8080` (vite.config.ts), `/api/sse`는 keep-alive 유지
- Docker: `/api` → `http://orkis-backend-dev:8080` (vite.config.docker.ts)
- 운영: nginx `/api/` → `orkis-backend.orkis.svc.cluster.local:80` (nginx/orkis.conf)

운영 nginx는 `Authorization`, `Cookie` 헤더 forward + `proxy_buffering off` (SSE) + 300s timeout.

## 배포

### Docker

```bash
docker build -t orkis-front:latest .
docker run -d -p 5173:5173 orkis-front:latest
```

운영 컨테이너는 nginx alpine 기반으로 K8s 환경에서 동작합니다 (kube-dns resolver 의존).

### Kubernetes

`k8s/` 매니페스트로 배포 (Jenkins CI/CD).

## 보존 자산

- `orkis-interface/` 디렉토리 — `orkis-desktop`이 path alias로 참조 (front 자체는 미사용, design은 자체 타입 사용)
- 인프라 파일: `Dockerfile`, `Dockerfile.dev`, `Jenkinsfile`, `k8s/`, `nginx/orkis.conf`, `.yarn/`, `.yarnrc.yml`

## 라이선스

비공개 (UNLICENSED).
