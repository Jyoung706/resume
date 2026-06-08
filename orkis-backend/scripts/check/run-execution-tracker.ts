/**
 * QueryExecutionTracker spec 케이스 검증 runner.
 *
 * 목적:
 *   Phase 1 PR#3 (D20) - cancel/ownership/GC 트래커의 핵심 동작을 케이스 명세.
 *   향후 추출/리팩토링 PR 에서 회귀 자동 감지.
 *
 * 사용:
 *   yarn check:executiontracker
 *
 * 케이스 (5):
 *   T1  register / has / unregister 라이프사이클
 *   T2  duplicate-ID register 시 throw
 *   T3  cancel-success - interrupt 호출 + unregister
 *   T4  cancel-ownership-reject - 다른 userId 거부, interrupt 미호출
 *   T5  cancel-not-found - 미등록 ID 거부
 *
 * 미포함:
 *   GC stale (STALE_THRESHOLD_MS = 5분) - 실시간 검증 불가, manual 항목.
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (§9.4, D20)
 */
// QueryExecutionTracker 가 @Service decorator 를 사용 - production 진입점이 아닌
// character/check runner 에서는 폴리필을 명시 import.
import "reflect-metadata";

import {
  QueryExecutionTracker,
  ExecutionHandle
} from "../../src/main/query/QueryExecutionTracker";

interface MockHandle extends ExecutionHandle {
  interruptCalls: number;
  closeCalls: number;
}

function makeHandle(): MockHandle {
  const h: MockHandle = {
    interruptCalls: 0,
    closeCalls: 0,
    interrupt() {
      h.interruptCalls++;
    },
    close() {
      h.closeCalls++;
    }
  };
  return h;
}

let failed = 0;

function assert(label: string, cond: boolean): void {
  if (cond) {
    stdout(`[ok]   ${label}`);
  } else {
    failed++;
    stdout(`[FAIL] ${label}`);
  }
}

function runCase(id: string, fn: () => void): void {
  try {
    fn();
  } catch (err: any) {
    failed++;
    stdout(`[ERR]  ${id}: ${err?.message ?? err}`);
  }
}

runCase("T1-register-unregister", () => {
  const t = new QueryExecutionTracker();
  const h = makeHandle();
  assert("T1.1 register 전 has=false", !t.has("id1"));
  t.register("id1", "user1", h);
  assert("T1.2 register 후 has=true", t.has("id1"));
  assert("T1.3 size=1", t.size() === 1);
  t.unregister("id1");
  assert("T1.4 unregister 후 has=false", !t.has("id1"));
  assert("T1.5 size=0", t.size() === 0);
});

runCase("T2-duplicate-register", () => {
  const t = new QueryExecutionTracker();
  t.register("dup", "u", makeHandle());
  let caught = false;
  let msg = "";
  try {
    t.register("dup", "u", makeHandle());
  } catch (err: any) {
    caught = true;
    msg = String(err?.message ?? err);
  }
  assert("T2.1 duplicate throw", caught);
  assert(
    "T2.2 메시지에 duplicate executionId 포함",
    msg.includes("duplicate executionId")
  );
});

runCase("T3-cancel-success", () => {
  const t = new QueryExecutionTracker();
  const h = makeHandle();
  t.register("id3", "user3", h);
  const result = t.cancel("id3", "user3");
  assert("T3.1 cancel result=true", result === true);
  assert("T3.2 interrupt 1회 호출", h.interruptCalls === 1);
  assert("T3.3 close 미호출 (cancel 은 interrupt 만)", h.closeCalls === 0);
  assert("T3.4 unregistered", !t.has("id3"));
});

runCase("T4-cancel-ownership-reject", () => {
  const t = new QueryExecutionTracker();
  const h = makeHandle();
  t.register("id4", "userA", h);
  const result = t.cancel("id4", "userB");
  assert("T4.1 cancel result=false", result === false);
  assert("T4.2 interrupt 미호출", h.interruptCalls === 0);
  assert("T4.3 still registered", t.has("id4"));
});

runCase("T5-cancel-not-found", () => {
  const t = new QueryExecutionTracker();
  const result = t.cancel("nonexistent", "user");
  assert("T5 cancel result=false", result === false);
});

stdout(`\n실패 ${failed} 건`);
if (failed > 0) process.exit(1);

function stdout(line: string): void {
  process.stdout.write(line + "\n");
}
