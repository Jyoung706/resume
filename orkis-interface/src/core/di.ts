import { CoreRequest } from './request';

/**
 * Core에서 Backend로 제공하는 DI 컨테이너 타입
 */
export interface DIContainer {
  register<T>(name: string, instance: T): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;
}

/**
 * Core에서 Backend로 제공하는 Bean 정의
 */
export interface BeanDefinition {
  name: string;
  type: 'singleton' | 'request' | 'transient';
  factory?: () => any;
  dependencies?: string[];
}

/**
 * Core에서 Backend로 제공하는 Middleware 타입
 */
export interface CoreMiddleware {
  name: string;
  handler: (req: CoreRequest, res: any, next: any) => void;
  order?: number;
}