/**
 * ORKIS Core DI Container
 * 
 * 의존성 주입 컨테이너 관련 모든 클래스와 인터페이스를 제공합니다.
 */

// 핵심 타입들
export * from './types';

// 컨테이너 구현체들
export { DIContainer } from './DIContainer';
export { ComponentScanner } from './ComponentScanner';
export { BeanFactory } from './BeanFactory';

// 편의 함수들
import { DIContainer } from './DIContainer';
import { ComponentScanner } from './ComponentScanner';

export const createDIContainer = (config?: any) => new DIContainer(config);
export const createComponentScanner = () => new ComponentScanner();