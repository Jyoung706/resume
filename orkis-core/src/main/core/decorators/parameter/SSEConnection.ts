import { PARAMETER_META_KEY, REQUEST_ARG_TYPE } from "../../constants";

export function Sse(
  target: any,
  propertyKey: string,
  parameterIndex: number
): void {
  const existingParam =
    Reflect.getMetadata(PARAMETER_META_KEY, target, propertyKey) || [];

  existingParam.push({
    index: parameterIndex,
    type: REQUEST_ARG_TYPE.SSE
  });

  Reflect.defineMetadata(
    PARAMETER_META_KEY,
    existingParam,
    target,
    propertyKey
  );
}
