import { PARAMETER_META_KEY, REQUEST_ARG_TYPE } from "../../constants";

export const Body = () => {
  return (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number
  ) => {
    const existing =
      Reflect.getMetadata(PARAMETER_META_KEY, target, propertyKey) || [];
    existing.push({ index: parameterIndex, type: REQUEST_ARG_TYPE.BODY });
    Reflect.defineMetadata(PARAMETER_META_KEY, existing, target, propertyKey);
  };
};
