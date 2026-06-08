import { systemLog } from "../../../utils/Logger";
import { AUTOWIRED_PROPERTY_META_KEY } from "../../constants";
import { AUTOWIRED_PROPERTIES_LIST } from "../../constants/internalKeys";
import { PROPERTY_META_INTERFACE } from "../../types";

export const Autowired = (className?: string) => {
  return (target: any, propertyKey: string) => {
    let previousValue = Reflect.getMetadata(
      AUTOWIRED_PROPERTY_META_KEY,
      target,
      propertyKey
    );
    if (previousValue) {
      systemLog.error(
        ` [${target}] has already 'AUTOWIRED' type metadata. previous meta [${previousValue}] will be overwrite [${className}] `
      );
    }

    Reflect.defineMetadata(
      AUTOWIRED_PROPERTY_META_KEY,
      {
        target: target,
        name: propertyKey,
        args: className
      } as PROPERTY_META_INTERFACE<string>,
      target,
      propertyKey
    );

    const existingProps: string[] =
      Reflect.getMetadata(AUTOWIRED_PROPERTIES_LIST, target) || [];

    if (!existingProps.includes(propertyKey)) {
      existingProps.push(propertyKey);
      Reflect.defineMetadata(AUTOWIRED_PROPERTIES_LIST, existingProps, target);
    }
  };
};
