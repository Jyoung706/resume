# --- Builder 단계 ---
  FROM node:24.2.0-bullseye AS builder

  RUN apt-get update && apt-get install -y \
      sqlite3 libsqlite3-dev python3 build-essential \
      && rm -rf /var/lib/apt/lists/*

  RUN corepack enable && corepack prepare yarn@4.9.0 --activate

  WORKDIR /app

  COPY . .

  # 의존성 설치
  RUN yarn install

  # 빌드
  RUN yarn build

  # --- Runner 단계 ---
  FROM node:24.2.0-bullseye-slim AS runner

  RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*
  RUN corepack enable && corepack prepare yarn@4.9.0 --activate

  WORKDIR /app

  # 필요한 추가 복사:
  COPY --from=builder /app/package.json ./
  COPY --from=builder /app/yarn.lock ./
  COPY --from=builder /app/.yarnrc.yml ./
  COPY --from=builder /app/.yarn ./.yarn
  COPY --from=builder /app/resources ./resources
  COPY --from=builder /app/src/db_file ./lib/src/db_file
  COPY --from=builder /app/src/sample_db ./lib/src/sample_db
  COPY --from=builder /app/node_modules ./node_modules

  COPY --from=builder /app/lib ./lib
  # orkis-interface lib 폴더도 복사
  COPY --from=builder /app/orkis-interface/lib ./lib/orkis-interface/lib

  # HTTP 포트
  EXPOSE 8080 8081

  # 환경 변수 설정
  ENV NODE_ENV=prod
  ENV WS_PORT=8081

  CMD ["yarn", "prod"]
