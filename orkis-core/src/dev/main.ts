import "reflect-metadata";
import { OrkisFactory } from "../main";

/**
 * Bootstrap the ORKIS Core application
 */
async function bootstrap() {
  await OrkisFactory.start(8000);
}

bootstrap();
