/**
 * ORKIS Core Application Launch Modes
 * 
 * 애플리케이션 시작 모드를 정의합니다.
 * 각 모드는 서로 다른 사용 패턴을 지원합니다.
 */
export enum LaunchMode {
  /**
   * 자동 감지 모드 (기존 방식 호환)
   * @Application 데코레이터가 있는 클래스를 자동으로 찾아서 Express 서버를 시작합니다.
   * CoreDefultApplication이 있으면 fallback으로 사용됩니다.
   */
  AUTO = 'auto',
  
  /**
   * 명시적 웹 애플리케이션 모드
   * Express 서버를 명시적으로 시작하며, DI 컨테이너와 함께 사용됩니다.
   * 사용자가 직접 Express 설정을 제어할 수 있습니다.
   */
  WEB_EXPLICIT = 'web',
  
  /**
   * DI 컨테이너 전용 모드
   * Express 서버 없이 순수 의존성 주입 컨테이너만 사용합니다.
   * Background 작업, CLI 도구, 배치 프로세서 등에 적합합니다.
   */
  DI_ONLY = 'di',
  
  /**
   * 사용자 정의 모드
   * 완전히 커스터마이즈된 애플리케이션 실행 방식을 지원합니다.
   * 사용자가 직접 초기화 로직을 제어할 수 있습니다.
   */
  CUSTOM = 'custom',

  /**
   * API 서버 모드
   * RESTful API 서비스 개발에 최적화된 모드입니다.
   */
  API = 'api',

  /**
   * 마이크로서비스 모드
   * 마이크로서비스 아키텍처에 최적화된 모드입니다.
   */
  MICROSERVICE = 'microservice',

  /**
   * 웹 애플리케이션 모드
   * 전통적인 웹 애플리케이션 개발에 최적화된 모드입니다.
   */
  WEB = 'web-app'
}

/**
 * Launch Mode 관련 유틸리티 함수들
 */
export class LaunchModeUtils {
  /**
   * 문자열을 LaunchMode enum으로 변환
   */
  static fromString(mode: string): LaunchMode {
    const upperMode = mode.toUpperCase();
    
    switch (upperMode) {
      case 'AUTO':
        return LaunchMode.AUTO;
      case 'WEB':
      case 'WEB_EXPLICIT':
        return LaunchMode.WEB_EXPLICIT;
      case 'DI':
      case 'DI_ONLY':
        return LaunchMode.DI_ONLY;
      case 'CUSTOM':
        return LaunchMode.CUSTOM;
      case 'API':
        return LaunchMode.API;
      case 'MICROSERVICE':
        return LaunchMode.MICROSERVICE;
      case 'WEB-APP':
        return LaunchMode.WEB;
      default:
        throw new Error(`Unsupported launch mode: ${mode}. Supported modes: auto, web, di, custom, api, microservice, web-app`);
    }
  }
  
  /**
   * LaunchMode가 Express 서버를 필요로 하는지 확인
   */
  static requiresExpress(mode: LaunchMode): boolean {
    return mode === LaunchMode.AUTO || mode === LaunchMode.WEB_EXPLICIT;
  }
  
  /**
   * LaunchMode가 자동 구성을 필요로 하는지 확인
   */
  static requiresAutoConfiguration(mode: LaunchMode): boolean {
    return mode === LaunchMode.AUTO;
  }
  
  /**
   * 개발자 친화적인 모드 설명 반환
   */
  static getDescription(mode: LaunchMode): string {
    switch (mode) {
      case LaunchMode.AUTO:
        return 'Automatic detection mode - compatible with existing orkis-backend pattern';
      case LaunchMode.WEB_EXPLICIT:
        return 'Explicit web application mode - DI container with Express server';
      case LaunchMode.DI_ONLY:
        return 'DI container only mode - suitable for background jobs and CLI tools';
      case LaunchMode.CUSTOM:
        return 'Custom mode - full user control over initialization process';
      default:
        return 'Unknown mode';
    }
  }
}