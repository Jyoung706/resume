import { randomUUID } from "node:crypto";
import {
  ConnectionInfo,
  ConnectionMetadata,
  DatabaseConfig
} from "../../database/types";
import { ApplicationContext } from "./ApplicationContext";
import { systemLog } from "../../utils/Logger";
import {
  ALL_CONNECTION_MAPPINGS_CACHE,
  AUTOWIRED_PROPERTIES_LIST,
  COMPONENT_SCAN_BEAN_META_KEY,
  CONNECTION_MAP,
  EXECUTION_CONTEXT,
  TRANSACTION_MODE
} from "../constants/internalKeys";
import {
  BaseAdapter,
  DatabaseClient,
  DatabaseConnectionManager,
  DatabaseFactory,
  DynamicConnectionSupport
} from "../../database";

/**
 * 트랜잭션 컨텍스트 인터페이스
 * - beanClone과 connection 정보를 함께 관리
 */
export interface TransactionContext {
  beanClone: any;
  connections: Map<string, ConnectionInfo>;
  requestUUID: string;
  withTransaction: boolean;
}

// 진행 중인 connection 획득 Promise를 저장하는 Map (Race Condition 방지)
const pendingConnections = new Map<string, Promise<ConnectionInfo>>();

/**
 * 트랜잭션 실행 (단순화된 버전)
 * - context 생성은 createTransactionContext에서 담당
 * - 이 함수는 순수하게 트랜잭션 실행만 담당
 */
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

/**
 * 자동 커밋 실행 (단순화된 버전)
 * - context 생성은 createTransactionContext에서 담당
 * - 이 함수는 순수하게 실행만 담당
 */
export async function executeWithAutoCommit(
  ctx: TransactionContext,
  originalMethod: Function,
  args: any[]
) {
  const { beanClone, connections, requestUUID } = ctx;

  systemLog.debug(`[AUTO-COMMIT] Ready for execId: ${requestUUID} (lazy mode)`);

  try {
    const result = await originalMethod.apply(beanClone, args);
    systemLog.debug(
      `[AUTO-COMMIT] Completed successfully for execId: ${requestUUID}`
    );
    return result;
  } catch (error) {
    systemLog.error(`[Auto-commit] Error`, error);
    throw error;
  } finally {
    await releaseConnections(connections, requestUUID, "auto-commit");
  }
}

/**
 * Lazy Proxy 생성 - 실제 접근 시에만 Bean clone 생성
 * - 2단계 이상 Bean에 적용하여 불필요한 clone 방지
 * - 모든 Proxy trap 구현으로 완전한 투명성 보장
 */
function createLazyBeanProxy(
  originalBean: any,
  connections: Map<string, ConnectionInfo>,
  databaseManager: DatabaseConnectionManager,
  requestUUID: string,
  withTransaction: boolean,
  visited: Map<any, any>
): any {
  let clonedBean: any = null;

  // Issue 3: 중복 제거를 위한 헬퍼 함수
  const ensureCloned = (): any => {
    if (!clonedBean) {
      clonedBean = createBeanCloneInternal(
        originalBean,
        connections,
        databaseManager,
        requestUUID,
        withTransaction,
        visited,
        false // isEntryPoint = false (내부 호출)
      );
      systemLog.debug(
        `[LAZY-CLONE] Bean cloned on first access: ${originalBean.constructor.name} for execId: ${requestUUID}`
      );
    }
    return clonedBean;
  };

  return new Proxy(originalBean, {
    // Issue 1: clonedBean을 receiver로 사용하여 올바른 this 바인딩
    get(target, prop, receiver) {
      const clone = ensureCloned();
      return Reflect.get(clone, prop, clone);
    },
    set(target, prop, value, receiver) {
      const clone = ensureCloned();
      return Reflect.set(clone, prop, value, clone);
    },
    // Issue 2: 추가 Proxy trap 구현
    has(target, prop) {
      return Reflect.has(ensureCloned(), prop);
    },
    ownKeys(target) {
      return Reflect.ownKeys(ensureCloned());
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(ensureCloned(), prop);
    },
    getPrototypeOf(target) {
      return Reflect.getPrototypeOf(ensureCloned());
    }
  });
}

/**
 * Entry point용 Bean clone 생성 (외부 호출용)
 * - 1단계 Bean만 직접 clone
 * - 2단계 이상 Bean은 Lazy Proxy 적용
 */
function createDeepBeanClone(
  beanInstance: any,
  connections: Map<string, ConnectionInfo>,
  databaseManager: DatabaseConnectionManager,
  requestUUID: string,
  withTransaction: boolean,
  visited: Map<any, any> = new Map()
): any {
  return createBeanCloneInternal(
    beanInstance,
    connections,
    databaseManager,
    requestUUID,
    withTransaction,
    visited,
    true // isEntryPoint = true (외부 호출)
  );
}

/**
 * 실제 Bean clone 생성 로직
 * - isEntryPoint=true: 중첩 Bean에 Lazy Proxy 적용
 * - isEntryPoint=false: 중첩 Bean에도 직접 clone (Lazy Proxy에서 호출 시)
 */
function createBeanCloneInternal(
  beanInstance: any,
  connections: Map<string, ConnectionInfo>,
  databaseManager: DatabaseConnectionManager,
  requestUUID: string,
  withTransaction: boolean,
  visited: Map<any, any>,
  isEntryPoint: boolean
): any {
  // 이미 clone된 Bean이면 재사용
  if (visited.has(beanInstance)) {
    return visited.get(beanInstance);
  }

  const beanClone = Object.create(Object.getPrototypeOf(beanInstance));
  visited.set(beanInstance, beanClone); // 먼저 등록 (순환 참조 방지)

  // 1. 기본 프로퍼티 복사 (Getter 제외)
  const propertyNames = Object.keys(beanInstance);
  for (const propName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(beanInstance, propName);
    if (descriptor) {
      if (descriptor.get) {
        // Getter는 복사하지 않음 (직접 값 할당 예정)
        continue;
      }
      beanClone[propName] = descriptor.value;
    }
  }

  // 2. Context 메타데이터 설정
  beanClone[EXECUTION_CONTEXT] = true;
  beanClone[CONNECTION_MAP] = connections;
  beanClone[TRANSACTION_MODE] = withTransaction;
  if (beanInstance[ALL_CONNECTION_MAPPINGS_CACHE]) {
    beanClone[ALL_CONNECTION_MAPPINGS_CACHE] =
      beanInstance[ALL_CONNECTION_MAPPINGS_CACHE];
  }

  // 3. @Autowired Bean 처리
  const target = Object.getPrototypeOf(beanInstance);
  const autowiredProps =
    Reflect.getMetadata(AUTOWIRED_PROPERTIES_LIST, target) || [];

  for (const propName of autowiredProps) {
    const originalNestedBean = beanInstance[propName];
    if (!originalNestedBean) continue;

    const beanMeta = Reflect.getMetadata(
      COMPONENT_SCAN_BEAN_META_KEY,
      originalNestedBean.constructor
    );
    if (!beanMeta) continue;

    // connection이 없는 유틸성 Bean은 원본 그대로 사용
    const hasConnections =
      originalNestedBean[ALL_CONNECTION_MAPPINGS_CACHE]?.length > 0;
    if (!hasConnections) {
      beanClone[propName] = originalNestedBean;
      continue;
    }

    if (isEntryPoint) {
      // Entry point: 2단계 Bean에는 Lazy Proxy 적용
      beanClone[propName] = createLazyBeanProxy(
        originalNestedBean,
        connections,
        databaseManager,
        requestUUID,
        withTransaction,
        visited
      );
    } else {
      // Lazy Proxy에서 호출: 직접 clone (재귀)
      const nestedClone = createBeanCloneInternal(
        originalNestedBean,
        connections,
        databaseManager,
        requestUUID,
        withTransaction,
        visited,
        false
      );
      beanClone[propName] = nestedClone;
    }
  }

  // 4. 현재 Bean의 connection에 LazyAdapter 주입
  const connectionMappings = (
    beanInstance[ALL_CONNECTION_MAPPINGS_CACHE] || []
  ).filter((m: any) => !m.beanPropertyName);

  for (const metadata of connectionMappings) {
    const { propertyKey, datasourceName, options } = metadata;

    if (options.dynamic) {
      beanClone[propertyKey] = undefined;
      continue;
    }
    if (options.type === "native") {
      continue;
    }

    const lazyAdapter = createLazyTransactionAdapter(
      datasourceName,
      connections,
      databaseManager,
      requestUUID,
      withTransaction
    );
    beanClone[propertyKey] = lazyAdapter;
  }

  return beanClone;
}

/**
 * 트랜잭션 컨텍스트 생성
 * - beanClone과 모든 중첩 Bean을 한번에 생성
 * - DynamicConnectionSupport 처리 포함
 */
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

  // DynamicConnectionSupport 처리
  if (beanInstance instanceof DynamicConnectionSupport) {
    const allConnectionMappings =
      (beanInstance as any)[ALL_CONNECTION_MAPPINGS_CACHE] || [];
    beanClone.prepareDynamicDBConnection = createPrepareDynamicDBConnection(
      allConnectionMappings,
      connections,
      beanClone,
      requestUUID,
      withTransaction ? "transaction" : "auto-commit"
    );
  }

  return { beanClone, connections, requestUUID, withTransaction };
}

/**
 * 주입할 adapter의 query 메서드를 connection 주입한채로 전달하기위한 함수
 */
function createWrappedAdapter(connectionInfo: ConnectionInfo): DatabaseClient {
  const wrappedAdapter: DatabaseClient = Object.create(connectionInfo.adapter);
  wrappedAdapter.query = (command: string, params?: any[]) => {
    return connectionInfo.adapter.query(
      command,
      params,
      connectionInfo.connection
    );
  };
  return wrappedAdapter;
}

function createLazyTransactionAdapter(
  datasourceName: string,
  connections: Map<string, ConnectionInfo>,
  databaseManager: DatabaseConnectionManager,
  requestUUID: string,
  withTransaction: boolean = true
): DatabaseClient {
  const adapter = databaseManager.getAdapter(datasourceName);
  const lazyAdapter: DatabaseClient = Object.create(adapter);

  // 요청별 고유 키 (같은 요청 내에서만 공유)
  const pendingKey = `${requestUUID}:${datasourceName}`;

  lazyAdapter.query = async (command: string, params?: any[]) => {
    let connectionInfo = connections.get(datasourceName);

    if (!connectionInfo) {
      // 이미 진행 중인 connection 획득이 있는지 확인
      let pendingPromise = pendingConnections.get(pendingKey);

      if (!pendingPromise) {
        // 첫 번째 쿼리: connection 획득 Promise 생성
        pendingPromise = (async () => {
          const connection = await adapter.connect();
          const processId =
            connection.processID || randomUUID().substring(0, 8);
          const info: ConnectionInfo = { adapter, connection, processId };

          // connections.set 직후 pendingConnections 삭제 (순서 보장으로 Race Condition 방지)
          connections.set(datasourceName, info);
          pendingConnections.delete(pendingKey);

          systemLog.debug(
            `[POOL-ACQUIRE-LAZY] Connection acquired: ${datasourceName} ` +
              `(pool-id: ${processId}) for execId: ${requestUUID}`
          );

          if (withTransaction && adapter.supportsTransaction()) {
            await adapter.beginTransaction(connection);
            systemLog.debug(
              `[TX-BEGIN-LAZY] Transaction started: ${datasourceName} ` +
                `(pool-id: ${processId}) for execId: ${requestUUID}`
            );
          }

          return info;
        })();

        pendingConnections.set(pendingKey, pendingPromise);
      }

      // 진행 중인 Promise 대기
      connectionInfo = await pendingPromise;
    }

    return await adapter.query(command, params, connectionInfo.connection);
  };

  return lazyAdapter;
}

export function createAutoCommitAdapter(adapter: BaseAdapter): DatabaseClient {
  const wrappedAdapter: DatabaseClient = Object.create(adapter);

  wrappedAdapter.query = async (command: string, params?: any[]) => {
    const conn = await adapter.connect();
    let queryError: Error | null = null;

    try {
      return await adapter.query(command, params, conn);
    } catch (error) {
      queryError = error as Error;
      throw error;
    } finally {
      try {
        await adapter.releaseConnection(conn);
      } catch (releaseError) {
        if (queryError) {
          // 원본 쿼리 에러가 있으면 release 에러는 로깅만 (원본 에러 보존)
          systemLog.error(
            `[AUTO-COMMIT] Release error during query failure: ${releaseError}`
          );
        } else {
          // 쿼리 성공 후 release 실패는 throw
          throw releaseError;
        }
      }
    }
  };

  return wrappedAdapter;
}

/**
 * 모든 connection에 대해 transaction 시작
 */
export async function beginTransactions(
  connections: Map<string, ConnectionInfo>,
  requestUUID: string
): Promise<void> {
  for (const [
    datasourceName,
    { adapter, connection, processId }
  ] of connections) {
    if (adapter.supportsTransaction()) {
      await adapter.beginTransaction(connection);
      systemLog.debug(
        `[TX-BEGIN] Transaction started: ${datasourceName} (pool-id: ${processId}) for execId: ${requestUUID}`
      );
    }
  }
}

/**
 * 모든 connection에 대해 transaction 커밋
 */
export async function commitTransactions(
  connections: Map<string, ConnectionInfo>,
  requestUUID: string
): Promise<void> {
  const committed: string[] = [];

  for (const [
    datasourceName,
    { adapter, connection, processId }
  ] of connections) {
    if (adapter.supportsTransaction()) {
      try {
        await adapter.commitTransaction(connection);
        committed.push(datasourceName);
        systemLog.debug(
          `[TX-COMMIT] Transaction committed: ${datasourceName} (pool-id: ${processId}) for execId: ${requestUUID}`
        );
      } catch (commitError) {
        // 부분 커밋 상태 추적 로깅 (롤백 불가한 상황 디버깅용)
        systemLog.error(
          `[TX-COMMIT-FAILED] Commit failed for ${datasourceName} (pool-id: ${processId}). ` +
            `Already committed: [${committed.join(", ")}]. Error: ${commitError}`
        );
        throw commitError;
      }
    }
  }
}

/**
 * 모든 connection에 대해 transaction 롤백
 */
export async function rollbackTransactions(
  connections: Map<string, ConnectionInfo>,
  requestUUID: string
): Promise<void> {
  for (const [
    datasourceName,
    { adapter, connection, processId }
  ] of connections) {
    try {
      if (adapter.supportsTransaction()) {
        await adapter.rollbackTransaction(connection);
        systemLog.debug(
          `[TX-ROLLBACK] Transaction rolled back: ${datasourceName} (pool-id: ${processId}) for execId: ${requestUUID}`
        );
      }
    } catch (rollbackError) {
      systemLog.error(
        `[TX-ROLLBACK] Rollback error for ${datasourceName} (pool-id: ${processId}): ${rollbackError}`
      );
    }
  }
}

/**
 * 모든 connection 해제
 */
export async function releaseConnections(
  connections: Map<string, ConnectionInfo>,
  requestUUID: string,
  mode: "transaction" | "auto-commit" = "transaction"
): Promise<void> {
  for (const [
    datasourceName,
    { adapter, connection, processId }
  ] of connections) {
    try {
      await adapter.releaseConnection(connection);
      const modeLabel = mode === "auto-commit" ? "AUTO-COMMIT" : "TX";
      systemLog.debug(
        `[POOL-RELEASE] Connection released (${modeLabel}): ${datasourceName} (pool-id: ${processId}) for execId: ${requestUUID}`
      );
    } catch (releaseError) {
      const modeLabel = mode === "auto-commit" ? "AUTO-COMMIT" : "TX";
      systemLog.error(
        `[POOL-RELEASE-ERROR] (${modeLabel}) Connection release error for ${datasourceName} (pool-id: ${processId}): ${releaseError}`
      );
    }
  }
}

export function createPrepareDynamicDBConnection(
  connectionMappings: ConnectionMetadata[],
  connections: Map<string, ConnectionInfo>,
  beanClone: any,
  requestUUID: string,
  mode: "transaction" | "auto-commit"
) {
  return async (databaseConfig: DatabaseConfig) => {
    const { databaseName, databaseType } = databaseConfig;

    if (!databaseConfig) {
      throw new Error("Dynamic connection require databaseConfig");
    }

    const dynamicConfig = {
      ...databaseConfig,
      pool: false
    };

    systemLog.debug(
      `[${requestUUID}] dynamicDB type ${databaseType} retrieved`
    );

    for (const mapping of connectionMappings) {
      const { beanPropertyName, propertyKey, options } = mapping;

      if (!options.dynamic) continue;

      const targetBean = beanPropertyName
        ? beanClone[beanPropertyName]
        : beanClone;

      if (targetBean[propertyKey] !== undefined) {
        continue;
      }

      let connectionInfo = connections.get(databaseName);

      // connectionInfo가 없을 때만 adapter 생성 (불필요한 객체 생성 방지)
      if (!connectionInfo) {
        const adapter = DatabaseFactory.createAdapter(dynamicConfig);
        await adapter.create();
        const connection = await adapter.connect();
        const processId = connection.processID || randomUUID().substring(0, 8);
        connectionInfo = { adapter, connection, processId };
        connections.set(databaseName, connectionInfo);

        if (mode === "transaction" && adapter.supportsTransaction()) {
          await adapter.beginTransaction(connection);
          systemLog.debug(
            `[TX-BEGIN-DYNAMIC] Transaction started for dynamic connection: ${databaseName} (pool-id: ${processId}) for execId: ${requestUUID}`
          );
        }

        systemLog.debug(
          `[POOL-ACQUIRE-DYNAMIC] Dynamic connection acquired: ${databaseName} (pool-id: ${processId}) for execId: ${requestUUID}`
        );
      }

      // connectionInfo의 adapter 사용
      if (options.type === "native") {
        targetBean[propertyKey] = connectionInfo.adapter.getConnectionInstance();
      } else {
        const wrappedAdapter = createWrappedAdapter(connectionInfo);
        targetBean[propertyKey] = wrappedAdapter;
        systemLog.debug(
          `[${requestUUID}] Dynamic connection injected into ${beanPropertyName}.${propertyKey}`
        );
      }
    }
  };
}
