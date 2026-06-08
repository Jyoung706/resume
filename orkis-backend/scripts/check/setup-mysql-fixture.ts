/**
 * Phase 3 PR#11-3 - MySQL fixture seed (mariadb driver 사용).
 *
 * docker compose 의 mysql-test 컨테이너 (port 33306) 에 mariadb driver 로 연결하여
 * 3개 schema (test_empty / test_small / test_large) 생성 + SQLite/PG fixture 와
 * 동일 스키마/row 시드. mariadb driver 가 MySQL 8.0 의 caching_sha2_password 인증을
 * 지원하므로 정상 동작.
 *
 * 매 실행 idempotent - DROP + CREATE.
 *
 * 사용:
 *   docker compose -f docker-compose.test.yml up -d mysql-test
 *   # mysql 부팅 약 15초 - healthcheck 통과 대기
 *   yarn mysql:setup
 *   yarn check:adaptercontract
 *
 * 환경변수 (default 값):
 *   MYSQL_TEST_HOST=127.0.0.1
 *   MYSQL_TEST_PORT=33306
 *   MYSQL_TEST_USER=test
 *   MYSQL_TEST_PASSWORD=test
 *   MYSQL_TEST_ROOT_PASSWORD=rootpass
 *
 * 참조: setup-mariadb-fixture.ts (MariaDB 컨테이너 시드, 본 파일과 코드 동일하되 포트만 다름)
 */
import "reflect-metadata";
import { seedFamily } from "./setupHelpers";

const HOST = process.env.MYSQL_TEST_HOST || "127.0.0.1";
const PORT = parseInt(process.env.MYSQL_TEST_PORT || "33306", 10);
const USER = process.env.MYSQL_TEST_USER || "test";
const PASSWORD = process.env.MYSQL_TEST_PASSWORD || "test";
const ROOT_PASSWORD = process.env.MYSQL_TEST_ROOT_PASSWORD || "rootpass";

seedFamily({
  label: "MySQL",
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  rootPassword: ROOT_PASSWORD
}).catch((err) => {
  process.stderr.write(`[fatal] ${err?.stack ?? err}\n`);
  process.exit(1);
});
