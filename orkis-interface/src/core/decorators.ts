/**
 * Core ↔ Backend Controller 데코레이터 정의
 */
export interface ControllerOptions {
  path?: string;
  middleware?: any[];
}

/**
 * Core ↔ Backend Service 데코레이터 정의
 */
export interface ServiceOptions {
  name?: string;
  scope?: 'singleton' | 'request' | 'transient';
}

/**
 * Core ↔ Backend RequestMapping 옵션
 */
export interface RequestMappingOptions {
  route: string;
  requestType: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  filteredType?: string;
}

/**
 * Core ↔ Backend Autowired 옵션
 */
export interface AutowiredOptions {
  name?: string;
  required?: boolean;
}