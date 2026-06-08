//ApplicationContext.ts
type EXCLUDE = string;
export interface CTX_OPTIONS {
  [key: string]: string | EXCLUDE[] | undefined;
  BASE?: string[];
  TARGET?: EXCLUDE[];
  DEBUG?: string;
  CONFIG?: string;
}

//DB query result
export interface RAW {
  [key: string]: string;
}
export type RST = RAW | RAW[] | undefined;

//DefaultTransactionData.ts
export interface TRANS_DATA {
  [key: string]: string | object | undefined;
  header: OBJECT_DEFAULT;
  body: {
    request: OBJECT_DEFAULT;
    response: OBJECT_DEFAULT;
  };
}

//DBConnectionManager.ts
export type DB_TYPE = "MYSQL" | "ORACLE" | "MSSQL";
// export type POOL_TYPE = Pool;
// export type CONNECTION_TYPE = PoolConnection;
// export type CONNECTIONS = MysqlDBConnection;

export enum CONNECTION_END_TYPE {
  COMMIT,
  ROLLBACK
}

//DBConnectionProvider.ts
export interface DB_OPTION {
  [key: string]: string | number | boolean | undefined;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  waitForConnections: boolean;
}

//Bean.ts
export type SCOPE_TYPE = "singleton" | "request" | "prototype" | "object";
export interface BEAN_OPTION {
  [key: string]: string | undefined;
  SCOPE?: SCOPE_TYPE;
  SUBTYPE?: string;
  MODULE_NAME?: string;
}

//CommonDaoSupport.ts
export interface DAO_OPTION {
  TYPE?: DB_TYPE;
  SCOPE: SCOPE;
}

//LogOptions.ts

export const LOG_LEVEL = Object.freeze({
  error: "error",
  warn: "warn",
  info: "info",
  http: "http",
  verbose: "verbose",
  debug: "debug",
  silly: "silly"
});
// export const LOG_COLOR: config.AbstractConfigSetColors = {
//     error: 'red',
//     warn: 'yellow',
//     help: 'white',
//     data: 'gray',
//     info: 'green',
//     debug: 'white',
//     prompt: 'gray',
//     verbose: 'gray',
//     input: 'gray',
//     silly: 'gray',
// }

export type LOG_DISPLAY_TYPE = "CONSOLE" | "FILE" | "DEFAULT";
export type LOGGER_TYPE_DEF = "DEBUG" | "ERROR" | "INFO";

export type OBJECT_DEFAULT = {
  [key: string]: any;
};

export enum COMPONENT_TYPE {
  NONE,
  APPLICATION_MAIN,
  TRANSACTION_PROCESSOR,
  COMPONENT,
  BEAN,
  RESOLVER,
  MIDDLEWARE,
  SESSION
}

export interface SCAN_TYPE {
  TYPE: COMPONENT_TYPE;
  PATH: string;
  CLASS_NAME: string;
  CLASS: any;
  BEAN?: any;
  ENTRY?: DocEntry;
  OPTION?: BEAN_OPTION;
}
export interface BEAN_MAP {
  [BEAN_NAME: string]: SCAN_TYPE;
}

//ComponentScan.ts
export interface PATH_INFO {
  FILE_NAME: string;
  BIZ_PATH: string;
  PATH: string;
}
export interface PATH_MAP {
  [key: string]: PATH_INFO;
}
export enum AST_TYPE {
  DECORATOR,
  CLASS,
  FIELD,
  METHOD
}
export interface AST_INFO {
  TYPE: AST_TYPE;
  NAME: string;
  NODE: object;
}

export interface AUTO_WIRED_TYPE {
  SCOPE: SCOPE_TYPE;
  INVOKE: Function;
}

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

//RequestContextHolder.ts
export type SCOPE = "request" | "prototype" | "singleton" | "default";
export const DEFAULT_CONTEXT = "DEFAULT_CONTEXT";

export interface DEFAULT_HTTP_REQUEST {
  [key: string]: string;
}

//RequestUtil
export type MIME_TYPE =
  | "any"
  | "rest"
  | "view"
  | "aac"
  | "abw"
  | "arc"
  | "avi"
  | "azw"
  | "bin"
  | "bz"
  | "bz2"
  | "csh"
  | "css"
  | "csv"
  | "doc"
  | "epub"
  | "gif"
  | "htm"
  | "html"
  | "ico"
  | "ics"
  | "jar"
  | "jpeg"
  | "jpg"
  | "png"
  | "js"
  | "json"
  | "mid"
  | "midi"
  | "mpeg"
  | "mpkg"
  | "odp"
  | "ods"
  | "odt"
  | "oga"
  | "ogv"
  | "ogx"
  | "pdf"
  | "ppt"
  | "rar"
  | "rtf"
  | "sh"
  | "svg"
  | "swf"
  | "tar"
  | "tif"
  | "tiff"
  | "ttf"
  | "vsd"
  | "wav"
  | "weba"
  | "webm"
  | "webp"
  | "woff"
  | "woff2"
  | "xhtml"
  | "xls"
  | "xml"
  | "xul"
  | "zip"
  | "3gp"
  | "3g2"
  | "7z"
  | "map";
export type MEDIA_TYPE = {
  [key in MIME_TYPE]: string;
};
export const MEDIA_TYPE_MAP: MEDIA_TYPE = {
  any: "plain/text",
  rest: "application/json",
  view: "text/html",
  aac: "audio/aac",
  abw: "application/x-abiword",
  arc: "application/octet-stream",
  avi: "video/x-msvideo",
  azw: "application/vnd.amazon.ebook",
  bin: "application/octet-stream",
  bz: "application/x-bzip",
  bz2: "application/x-bzip2",
  csh: "application/x-csh",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  epub: "application/epub+zip",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ics: "text/calendar",
  jar: "application/java-archive",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  js: "application/js",
  json: "application/json",
  mid: "audio/midi",
  midi: "audio/midi",
  mpeg: "video/mpeg",
  mpkg: "application/vnd.apple.installer+xml",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  rar: "application/x-rar-compressed",
  rtf: "application/rtf",
  sh: "application/x-sh",
  svg: "image/svg+xml",
  swf: "application/x-shockwave-flash",
  tar: "application/x-tar",
  tif: "image/tiff",
  tiff: "image/tiff",
  ttf: "application/x-font-ttf",
  vsd: "application/vnd.visio",
  wav: "audio/x-wav",
  weba: "audio/webm",
  webm: "video/webm",
  webp: "image/webp",
  woff: "application/x-font-woff",
  woff2: "application/x-font-woff",
  xhtml: "application/xhtml+xml",
  xls: "application/vnd.ms-excel",
  xml: "application/xml",
  xul: "application/vnd.mozilla.xul+xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "7z": "application/x-7z-compressed",
  map: "application/js"
} as const;

export interface FILE_INFO {
  name: string;
  extension: string;
}

export enum PARSE_TYPE {
  JSON = "json",
  XML = "xml"
}
