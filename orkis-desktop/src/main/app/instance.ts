import { OrkisApplication } from "./OrkisApplication";

/**
 * 앱 전역 OrkisApplication 싱글톤.
 * 모듈 캐싱으로 전 프로세스에서 동일 인스턴스 보장.
 */
export const orkis = new OrkisApplication();
