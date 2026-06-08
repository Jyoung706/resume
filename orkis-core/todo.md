# Orkis-Core: TransactionContext 리팩토링

## 배경

### 현재 구조의 문제점

1. **Getter Proxy 복잡성**: 모든 @Autowired Bean에 Getter Proxy 설치 필요
2. **getOrCreateBeanClone 복잡성**: 50줄+ 함수로 런타임에 clone 생성
3. **코드 중복**: executeWithTransaction과 executeWithAutoCommit에 유사한 clone 로직
4. **책임 혼재**: executeWithTransaction이 clone 생성 + 트랜잭션 관리 모두 담당

### 목표 (옵션 B)

1. **createTransactionContext**: clone + 초기화 로직 통합
2. **executeWithTransaction/executeWithAutoCommit**: 순수하게 실행만 담당
3. **Getter Proxy 제거**: 미리 clone된 Bean 직접 할당
4. **코드 단순화**: 중복 제거, 책임 분리

---

## 변경 전후 비교

### 변경 전 흐름

```
BeanResolver.wrapTransactionalMethods
  └── 래핑된 메서드: executeWithTransaction(this, originalMethod, args)

executeWithTransaction 내부:
  ├── beanClone 생성 (Service만)
  ├── LazyAdapter 주입 (현재 Bean만)
  └── originalMethod.apply(beanClone, args)
        └── this.mainDao 접근 → Getter Proxy → getOrCreateBeanClone()
              └── MainDao clone 생성 + LazyAdapter 주입
```

### 변경 후 흐름

```
BeanResolver.wrapTransactionalMethods
  └── 래핑된 메서드:
        ├── createTransactionContext(this, withTransaction)
        │     └── createDeepBeanClone (모든 중첩 Bean 포함)
        └── executeWithTransaction(txContext, originalMethod, args)

executeWithTransaction 내부:
  └── originalMethod.apply(beanClone, args)
        └── this.mainDao 접근 → 이미 clone된 Bean 반환 (Getter 불필요!)
```

---

## 리팩토링 스텝

### Step 1: TransactionContext 인터페이스 정의

**파일**: `transactionResolver.ts`

```typescript
interface TransactionContext {
  beanClone: any;
  connections: Map<string, ConnectionInfo>;
  requestUUID: string;
  withTransaction: boolean;
}
```

---

### Step 2: createDeepBeanClone 함수 구현

**파일**: `transactionResolver.ts`

- 재귀적으로 모든 @Autowired Bean clone
- 각 Bean의 @InjectConnection에 LazyAdapter 주입
- 순환 참조 방지 (visited Set 사용)
- DynamicConnectionSupport 처리

```typescript
function createDeepBeanClone(
  beanInstance: any,
  connections: Map<string, ConnectionInfo>,
  databaseManager: DatabaseConnectionManager,
  requestUUID: string,
  withTransaction: boolean,
  visited: Set<any> = new Set()
): any {
  // 순환 참조 방지
  if (visited.has(beanInstance)) {
    return beanInstance; // 또는 이미 생성된 clone 반환
  }
  visited.add(beanInstance);

  const beanClone = Object.create(Object.getPrototypeOf(beanInstance));

  // 1. 기본 프로퍼티 복사 (Getter 제외)
  // 2. 현재 Bean의 connection에 LazyAdapter 주입
  // 3. @Autowired Bean들 재귀적으로 clone
  // 4. DynamicConnectionSupport 처리

  return beanClone;
}
```

---

### Step 3: createTransactionContext 함수 구현

**파일**: `transactionResolver.ts`

```typescript
export function createTransactionContext(
  beanInstance: any,
  withTransaction: boolean = true
): TransactionContext {
  const requestUUID = randomUUID().substring(0, 8);
  const connections = new Map<string, ConnectionInfo>();
  const databaseManager = ApplicationContext.getDatabaseManager();

  if (!databaseManager) {
    throw new Error("DatabaseManager not found");
  }

  const beanClone = createDeepBeanClone(
    beanInstance,
    connections,
    databaseManager,
    requestUUID,
    withTransaction
  );

  // Context 설정
  beanClone[CONNECTION_MAP] = connections;
  beanClone[EXECUTION_CONTEXT] = true;
  beanClone[TRANSACTION_MODE] = withTransaction;

  // DynamicConnectionSupport 처리
  if (beanInstance instanceof DynamicConnectionSupport) {
    beanClone.prepareDynamicDBConnection = createPrepareDynamicDBConnection(
      beanInstance[ALL_CONNECTION_MAPPINGS_CACHE] || [],
      connections,
      beanClone,
      requestUUID,
      withTransaction ? "transaction" : "auto-commit"
    );
  }

  return { beanClone, connections, requestUUID, withTransaction };
}
```

---

### Step 4: executeWithTransaction 단순화

**파일**: `transactionResolver.ts`

변경 전: ~80줄 (clone 생성 + 트랜잭션 관리)
변경 후: ~25줄 (트랜잭션 관리만)

```typescript
export async function executeWithTransaction(
  ctx: TransactionContext,
  originalMethod: Function,
  args: any[],
  transactionalMeta?: any
) {
  const { beanClone, connections, requestUUID } = ctx;

  systemLog.debug(
    `[@Transactional:${transactionalMeta?.propagation?.description || "REQUIRED"}] ` +
      `Ready for execId: ${requestUUID} (lazy mode)`
  );

  try {
    const result = await originalMethod.apply(beanClone, args);
    await commitTransactions(connections, requestUUID);
    return result;
  } catch (error) {
    await rollbackTransactions(connections, requestUUID);
    throw error;
  } finally {
    await releaseConnections(connections, requestUUID, "transaction");
  }
}
```

---

### Step 5: executeWithAutoCommit 단순화

**파일**: `transactionResolver.ts`

변경 전: ~70줄 (clone 생성 + 실행)
변경 후: ~20줄 (실행만)

```typescript
export async function executeWithAutoCommit(
  ctx: TransactionContext,
  originalMethod: Function,
  args: any[]
) {
  const { beanClone, connections, requestUUID } = ctx;

  systemLog.debug(`[AUTO-COMMIT] Ready for execId: ${requestUUID} (lazy mode)`);

  try {
    const result = await originalMethod.apply(beanClone, args);
    systemLog.debug(`[AUTO-COMMIT] Completed for execId: ${requestUUID}`);
    return result;
  } catch (error) {
    systemLog.error(`[Auto-commit] Error`, error);
    throw error;
  } finally {
    await releaseConnections(connections, requestUUID, "auto-commit");
  }
}
```

---

### Step 6: BeanResolver.wrapTransactionalMethods 수정

**파일**: `BeanResolver.ts`

```typescript
private wrapTransactionalMethods(instance: any, target: any): void {
  // ... 기존 코드 ...

  for (const methodName of methodNames) {
    const originalMethod = target[methodName];

    instance[methodName] = async function (...args: any[]) {
      const { propagation = REQUIRED } = transactionalMeta;

      if (!hasConnections) {
        return await originalMethod.apply(this, args);
      }

      // 이미 트랜잭션 내부
      if (this[EXECUTION_CONTEXT]) {
        if (propagation === REQUIRES_NEW) {
          const ctx = createTransactionContext(this, true);
          return await executeWithTransaction(ctx, originalMethod, args, transactionalMeta);
        } else {
          return await originalMethod.apply(this, args);
        }
      }

      // 트랜잭션 외부에서 호출
      if (propagation === SUPPORTS) {
        const ctx = createTransactionContext(this, false);
        return await executeWithAutoCommit(ctx, originalMethod, args);
      } else {
        const ctx = createTransactionContext(this, true);
        return await executeWithTransaction(ctx, originalMethod, args, transactionalMeta);
      }
    };
  }
}
```

---

### Step 7: Getter Proxy 제거 또는 단순화

**파일**: `BeanResolver.ts`

- `installAutowiredGetterProxies` 함수 제거 또는 단순화
- Getter Proxy 대신 직접 Bean 참조 (clone 시점에 이미 처리됨)

**검토 필요**:
- 트랜잭션 외부에서 @Autowired Bean 접근 시 원본 싱글톤 반환해야 함
- Getter Proxy를 완전히 제거하면 이 동작이 변경됨
- 옵션: Getter Proxy는 유지하되, getOrCreateBeanClone 대신 단순 반환

---

### Step 8: 불필요한 코드 제거

**파일**: `transactionResolver.ts`

- `getOrCreateBeanClone` 함수 제거
- `createBeanClone` 함수 제거 (createDeepBeanClone으로 대체)
- `BEAN_CLONE_CACHE` 관련 로직 제거

**파일**: `metaKeys.ts`

- `BEAN_CLONE_CACHE` Symbol 제거 검토

---

### Step 9: 테스트 및 검증

1. 빌드 확인: `yarn build:dev`
2. 기능 테스트:
   ```bash
   curl http://localhost:8000/eager/main-only   # MainDao만 사용
   curl http://localhost:8000/eager/log-only    # LogDao만 사용
   curl http://localhost:8000/eager/both        # 둘 다 사용
   ```
3. 로그 확인:
   - `[POOL-ACQUIRE-LAZY]`가 첫 쿼리 시점에 나타나야 함
   - 사용하지 않는 datasource 로그 없어야 함

---

## 파일별 변경 요약

| 파일 | 변경 내용 |
|------|-----------|
| `transactionResolver.ts` | TransactionContext 추가, createDeepBeanClone 추가, createTransactionContext 추가, executeWithTransaction/executeWithAutoCommit 단순화, getOrCreateBeanClone 제거 |
| `BeanResolver.ts` | wrapTransactionalMethods에서 createTransactionContext 호출, installAutowiredGetterProxies 검토 |
| `metaKeys.ts` | BEAN_CLONE_CACHE 제거 검토 |

---

## 예상 코드 라인 변화

| 항목 | 변경 전 | 변경 후 | 차이 |
|------|---------|---------|------|
| executeWithTransaction | ~80줄 | ~25줄 | -55줄 |
| executeWithAutoCommit | ~70줄 | ~20줄 | -50줄 |
| getOrCreateBeanClone | ~60줄 | 0줄 | -60줄 |
| createDeepBeanClone | 0줄 | ~50줄 | +50줄 |
| createTransactionContext | 0줄 | ~30줄 | +30줄 |
| **총계** | ~210줄 | ~125줄 | **-85줄** |

---

## 주의사항

1. **순환 참조**: createDeepBeanClone에서 visited Set으로 방지
2. **REQUIRES_NEW**: 기존 트랜잭션 내부에서 새 트랜잭션 생성 시 별도 context
3. **Getter Proxy 동작**: 트랜잭션 외부에서 Bean 접근 시 원본 반환 보장
4. **DynamicConnectionSupport**: prepareDynamicDBConnection 주입 시점 확인
