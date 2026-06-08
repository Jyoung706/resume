import { systemLog } from "../../../utils/Logger";
import { VALUE_PROPERTY_META_KEY } from "../../constants";
import { VALUE_PROPERTIES_LIST } from "../../constants/internalKeys";
import { PROPERTY_META_INTERFACE } from "../../types";

export const Value = (args: string) => {
  return (target: any, propertyKey: string) => {
    let previousValue = Reflect.getMetadata(
      VALUE_PROPERTY_META_KEY,
      target,
      propertyKey
    );
    if (previousValue) {
      systemLog.error(
        ` [${target}] has already 'VALUE' type metadata. previous meta [${previousValue}] will be overwrite [${args}]  `
      );
    }

    Reflect.defineMetadata(
      VALUE_PROPERTY_META_KEY,
      {
        target: target,
        name: propertyKey,
        args: args
      } as PROPERTY_META_INTERFACE<string>,
      target,
      propertyKey
    );

    const existingProps: string[] =
      Reflect.getMetadata(VALUE_PROPERTIES_LIST, target) || [];

    if (!existingProps.includes(propertyKey)) {
      existingProps.push(propertyKey);
      Reflect.defineMetadata(VALUE_PROPERTIES_LIST, existingProps, target);
    }
  };
};
