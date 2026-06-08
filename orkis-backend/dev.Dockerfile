# 개발 환경용 Dockerfile
FROM node:24.2.0-bullseye

# 빌드 인자: 사용할 package 파일 (기본값: package.json)
ARG PACKAGE_FILE=package.json

# 개발 도구 및 SQLite 설치 (prod와 동일한 환경)
RUN apt-get update && apt-get install -y \
    sqlite3 libsqlite3-dev python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

# Corepack 활성화 및 Yarn 4.9.0 설정
RUN corepack enable && corepack prepare yarn@4.9.0 --activate

WORKDIR /app

# 전체 소스 복사
COPY . .

COPY ${PACKAGE_FILE} ./package.json

# 의존성 설치
RUN yarn install

# 포트 노출
EXPOSE 8080
# WebSocket 포트
EXPOSE 8081
EXPOSE 9229

# # 환경 변수 설정
ENV NODE_ENV=development
ENV WS_PORT=8081

# 개발 서버 실행 (디버그 모드)
CMD ["yarn", "dev:debug"]
