import { REQUIRED, TRANSACTION_PROPAGATION } from "../../../database/types";
import { META_KEYS } from "../../constants";

export interface TransactionalOptions {
  propagation?: TRANSACTION_PROPAGATION;
}

export function Transactional(options?: TransactionalOptions): any {
  return function (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor
  ): any {
    const metadata = {
      enabled: true,
      propagation: options?.propagation || REQUIRED
    };

    // 클래스 데코레이터
    if (propertyKey === undefined && descriptor === undefined) {
      Reflect.defineMetadata(META_KEYS.TRANSACTIONAL_CLASS, metadata, target);
      return target;
    }

    // 메서드 데코레이터
    Reflect.defineMetadata(
      META_KEYS.TRANSACTIONAL_METHOD,
      metadata,
      target,
      propertyKey!
    );
    return descriptor;
  };
}
