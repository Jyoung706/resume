# Node.js 이미지를 사용하여 빌드
FROM node:24.2.0-alpine3.22 AS builder

# Git 설치 (Yarn 의존성 다운로드 시 일부 git 패키지 호환성)
RUN apk add --no-cache git

# Corepack 활성화 및 Yarn 4.9.0 설정
RUN corepack enable && corepack prepare yarn@4.9.0 --activate

WORKDIR /app

# package.json과 yarn.lock 파일 복사
COPY package.json yarn.lock ./

# Yarn Berry 설정 파일 복사
COPY .yarnrc.yml ./
COPY .yarn .yarn/

# 의존성 설치
RUN yarn install

# 소스 코드 복사
COPY . .

# 프로덕션 빌드 (Docker 전용 설정 사용 — minify:false for Emotion CSS)
ENV VITE_API_BASE=/api
ENV VITE_ENABLE_AGENTATION=false
RUN npx vite build --config vite.config.docker.ts --mode production

# Nginx를 사용하여 정적 파일 서빙
FROM nginx:stable-alpine3.21-slim AS runner

RUN apk update && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# 커스텀 nginx 설정 복사
COPY nginx/ /etc/nginx/conf.d/

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo "healthy" > /usr/share/nginx/html/health.html && \
    chown nginx:nginx /usr/share/nginx/html/health.html

EXPOSE 5173

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]
