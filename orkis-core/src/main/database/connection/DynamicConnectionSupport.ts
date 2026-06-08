import { DatabaseConfig } from "../types";

export abstract class DynamicConnectionSupport {
  protected prepareDynamicDBConnection!: (
    config: DatabaseConfig
  ) => Promise<void>;
}
