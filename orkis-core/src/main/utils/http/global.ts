import { InternalHttpModule } from "./InternalHttpModule";
import { HttpModuleOptions } from "./types";

export function registerGlobalHttpModule(options?: HttpModuleOptions): void {
  globalThis.api = new InternalHttpModule(options);
}
