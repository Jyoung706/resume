import { Agent } from "undici";
import { BaseHttpModule } from "./BaseHttpModule";
import { HttpModuleOptions } from "./types";

export class InternalHttpModule extends BaseHttpModule {
  protected dispatcher: Agent;
  protected baseURL: string;

  constructor(options: HttpModuleOptions = {}) {
    super(options.timeout, options.headers);
    this.baseURL = options.baseURL ?? "";
    this.dispatcher = new Agent({
      keepAliveTimeout: options.keepAliveTimeout ?? 10_000,
      keepAliveMaxTimeout: 30_000,
      connections: options.connections ?? 100
    });
  }
}
