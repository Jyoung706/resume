import { Dispatcher, Pool } from "undici";
import { BaseHttpModule } from "./BaseHttpModule";
import { HttpModuleOptions } from "./types";

export class HttpModule extends BaseHttpModule {
  protected dispatcher: Dispatcher;
  protected baseURL: string;

  constructor(options: HttpModuleOptions) {
    if (!options.baseURL) {
      throw new Error(
        "BaseURL required, normal request use global Http Request Module"
      );
    }

    super(options.timeout, options.headers);

    this.baseURL = options.baseURL;
    this.dispatcher = new Pool(options.baseURL, {
      connections: options.connections ?? 100,
      keepAliveTimeout: options.keepAliveTimeout ?? 10_000,
      keepAliveMaxTimeout: 30_000,
      socketPath: options.socketPath
    });
  }
}
