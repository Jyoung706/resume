import { BEAN_SCAN_TYPES, BEAN_STATES } from "../constants/beanConst";
import { SCOPE_TYPE } from "./option.types";

export type BEAN_SCAN_TYPE =
  (typeof BEAN_SCAN_TYPES)[keyof typeof BEAN_SCAN_TYPES];
export type BEAN_STATE = (typeof BEAN_STATES)[keyof typeof BEAN_STATES];

export interface BEANS {
  [key: string]: BEAN | undefined;
}

export interface BEAN {
  name: string;
  state: BEAN_STATE;
  target?: {
    name: string; //class name
    origin?: any; // class origin type
    path?: string; // generate from file path when it needed
    instance?: any;
  };
  scanType?: BEAN_SCAN_TYPE;
  scope?: SCOPE_TYPE;
  option?: any;
}

export interface BeanMetadata {
  name: string;
  scanType: BEAN_SCAN_TYPE;
  scope: SCOPE_TYPE;
  option?: any;
}
