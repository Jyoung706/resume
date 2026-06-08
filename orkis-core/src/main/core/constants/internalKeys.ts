/**
 * 내부 구현용 Symbol들
 * - 이 파일은 @orkis/core/common에서 export되지 않음
 * - 코어 내부에서만 사용
 */

// Bean 스캔 및 DI 컨테이너용
export const COMPONENT_SCAN_BEAN_META_KEY: unique symbol = Symbol(
  "component:scan:bean:meta"
);
export const AUTOWIRED_PROPERTIES_LIST = Symbol("autowired:properties:list");
export const VALUE_PROPERTIES_LIST = Symbol("value:properties:list");

// 트랜잭션 컨텍스트용
export const EXECUTION_CONTEXT = Symbol("execution:context");
export const CONNECTION_MAP = Symbol("connection:map");
export const TRANSACTION_MODE = Symbol("transaction:mode");
export const ALL_CONNECTION_MAPPINGS_CACHE = Symbol(
  "all:connection:mappings:cache"
);
