import { DatabaseConfig as DatabaseConfigType } from "../../../database/types";
import { DATABASE_CONFIGS_REGISTRY_KEY } from "../../constants";

type DatabaseConfigOptions = DatabaseConfigType & {
  autoConnect?: boolean;
};

export function DatabaseConfig(config: DatabaseConfigOptions) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const existing =
      Reflect.getMetadata(DATABASE_CONFIGS_REGISTRY_KEY, global) || [];

    existing.push(config);

    Reflect.defineMetadata(DATABASE_CONFIGS_REGISTRY_KEY, existing, global);

    return target;
  };
}
