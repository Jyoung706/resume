/**
 * Phase 3 PR#11-3 - MariaDB fixture seed (mariadb driver 사용).
 *
 * docker compose 의 mariadb-test 컨테이너 (port 33307) 에 mariadb driver 로
 * 연결하여 3개 schema 생성 + 시드. setup-mysql-fixture 와 코드 공유 - 포트만 다름.
 *
 * 사용:
 *   docker compose -f docker-compose.test.yml up -d mariadb-test
 *   yarn mariadb:setup
 *   yarn check:adaptercontract
 *
 * 환경변수 (default 값):
 *   MARIADB_TEST_HOST=127.0.0.1
 *   MARIADB_TEST_PORT=33307
 *   MARIADB_TEST_USER=test
 *   MARIADB_TEST_PASSWORD=test
 *   MARIADB_TEST_ROOT_PASSWORD=rootpass
 */
import "reflect-metadata";
import { seedFamily } from "./setupHelpers";

const HOST = process.env.MARIADB_TEST_HOST || "127.0.0.1";
const PORT = parseInt(process.env.MARIADB_TEST_PORT || "33307", 10);
const USER = process.env.MARIADB_TEST_USER || "test";
const PASSWORD = process.env.MARIADB_TEST_PASSWORD || "test";
const ROOT_PASSWORD = process.env.MARIADB_TEST_ROOT_PASSWORD || "rootpass";

seedFamily({
  label: "MariaDB",
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  rootPassword: ROOT_PASSWORD
}).catch((err) => {
  process.stderr.write(`[fatal] ${err?.stack ?? err}\n`);
  process.exit(1);
});
