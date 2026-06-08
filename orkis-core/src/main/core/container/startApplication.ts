import { ApplicationContext } from "./ApplicationContext";
// 애플리케이션 컨텍스트 자동 실행 함수
export async function startApplication(): Promise<void> {
  // systemLog.info("startApplication ----------------------- ");
  await ApplicationContext.initialize();
  ApplicationContext.run();
}
