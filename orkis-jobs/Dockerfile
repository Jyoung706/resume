# ---- Builder ----

FROM node:24.2.0-bullseye AS builder

RUN apt-get update && apt-get install -y \
    sqlite3 libsqlite3-dev python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare yarn@4.9.0 --activate

WORKDIR /app

COPY . .

RUN yarn install && yarn build:prod

RUN ls -al lib/ | head -20

# ---- Runner ----

FROM node:24.2.0-bullseye-slim AS runner

RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare yarn@4.9.0 --activate

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/yarn.lock ./yarn.lock

# 이미 빌드된 node_modules를 복사 (네이티브 모듈 포함)
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/lib ./lib

CMD ["yarn", "start"]