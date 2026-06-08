//TSDocumentParser.ts, TSDocumentSimpleParser.ts
export interface DocEntry {
  name?: string;
  value?: string;
  scope?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  parameterValues?: DocEntry[];
  decorators?: DocEntry[];
  fields?: DocEntry[];
  returnType?: string;
}

export interface ENV_INFO {
  [key: string]: any;
  name?: string;
  mode: string;
  coreroot: string;
  approot: string;
  node_modules_path: string;
  businesspath: string;
  resourcepath: string;
  assetpath: string;
  ENV: any;
}

export interface FILE_INFO {
  name: string;
  extension: string;
}

export interface AUTOWIRED_INFO {
  className: string;
  args?: any[];
}
