import { PARAMETER_META_KEY } from "../../constants";

export const Part = (fieldName: string) => {
  return (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number
  ) => {
    const existing =
      Reflect.getMetadata(PARAMETER_META_KEY, target, propertyKey) || [];
    existing.push({ index: parameterIndex, type: "part", fieldName });
    Reflect.defineMetadata(PARAMETER_META_KEY, existing, target, propertyKey);
  };
};
