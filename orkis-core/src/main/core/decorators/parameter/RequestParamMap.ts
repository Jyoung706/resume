import { PARAMETER_META_KEY, REQUEST_ARG_TYPE } from "../../constants";

/**
 * Method Decorator: RequestParamMap
 * @param key
 * @constructor
 */
export const ParamMap = () => {
  return (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number
  ) => {
    const existing =
      Reflect.getMetadata(PARAMETER_META_KEY, target, propertyKey) || [];
    existing.push({
      index: parameterIndex,
      type: REQUEST_ARG_TYPE.REQUEST_MAP
    });
    Reflect.defineMetadata(PARAMETER_META_KEY, existing, target, propertyKey);
  };
};
