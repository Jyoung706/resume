import { PARAMETER_META_KEY, REQUEST_ARG_TYPE } from "../../constants";

export const Files = (fieldName: string) => {
  return (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number
  ) => {
    const existing =
      Reflect.getMetadata(PARAMETER_META_KEY, target, propertyKey) || [];
    existing.push({
      index: parameterIndex,
      type: REQUEST_ARG_TYPE.FILES,
      fieldName
    });
    Reflect.defineMetadata(PARAMETER_META_KEY, existing, target, propertyKey);
  };
};

// fileupload 추가수정 진행해야함
