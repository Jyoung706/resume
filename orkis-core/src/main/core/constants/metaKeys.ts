export const CONFIGURATION_META_KEY: unique symbol = Symbol(
  "CONFIGURATION_META_KEY"
);
export const APPLICATION_META_KEY: unique symbol = Symbol(
  "APPLICATION_META_KEY"
);
export const SERVICE_META_KEY: unique symbol = Symbol("SERVICE_META_KEY");

export const VALUE_PROPERTY_META_KEY: unique symbol = Symbol(
  "VALUE_PROPERTY_META_KEY"
);
export const AUTOWIRED_PROPERTY_META_KEY: unique symbol = Symbol(
  "AUTOWIRED_PROPERTY_META_KEY"
);
export const SESSION_PROPERTY_META_KEY: unique symbol = Symbol(
  "SESSION_PROPERTY_META_KEY"
);

export const REQUEST_MAPPING_META_KEY: unique symbol = Symbol(
  "REQUEST_MAPPING_META_KEY"
);

export const PROPERTY_META_KEY_TYPES = {
  VALUE: VALUE_PROPERTY_META_KEY,
  AUTOWIRED: AUTOWIRED_PROPERTY_META_KEY,
  SESSION: SESSION_PROPERTY_META_KEY
};

export const DEFAULT_META_KEY: unique symbol = Symbol("DEFAULT_META_KEY");
export const PARAMETER_META_KEY: unique symbol = Symbol("PARAMETER_META_KEY");

export const REQUEST_PROPERTY_KEY: unique symbol = Symbol(
  "REQUEST_PROPERTY_KEY"
);
export const SINGLETON_PROPERTY_KEY: unique symbol = Symbol(
  "SINGLETON_PROPERTY_KEY"
);
export const NEW_PROPERTY_KEY: unique symbol = Symbol("NEW_PROPERTY_KEY");
export const SESSION_PROPERTY_KEY: unique symbol = Symbol(
  "SESSION_PROPERTY_KEY"
);
export const FILE_PROPERTY_KEY: unique symbol = Symbol("FILE_PROPERTY_KEY");

export const DAO_META_KEY: unique symbol = Symbol("DAO_META_KEY");

export const PROPERTY_META_KEY: unique symbol = Symbol("PROPERTY_META_KEY");
export const DYNAMIC_INJECT_META_KEY: unique symbol = Symbol(
  "DYNAMIC_INJECT_META_KEY"
);
export const REQUEST_OBJ_PROPERTY_KEY: unique symbol = Symbol(
  "REQUEST_OBJ_PROPERTY_KEY"
);
export const RESPONSE_OBJ_PROPERTY_KEY: unique symbol = Symbol(
  "RESPONSE_OBJ_PROPERTY_KEY"
);

export const REQUEST_BODY_PROPERTY_KEY: unique symbol = Symbol(
  "REQUEST_BODY_PROPERTY_KEY"
);
export const REQUEST_PARAM_PROPERTY_KEY: unique symbol = Symbol(
  "REQUEST_PARAM_PROPERTY_KEY"
);
export const REQUEST_PARAM_MAP_PROPERTY_KEY: unique symbol = Symbol(
  "REQUEST_PARAM_MAP_PROPERTY_KEY"
);

export type META_KEY_TYPE =
  | typeof DEFAULT_META_KEY
  | typeof PARAMETER_META_KEY
  | typeof PROPERTY_META_KEY
  | typeof SESSION_PROPERTY_META_KEY;

export const SERVICE_PROPERTY_META_KEY: unique symbol = Symbol(
  "SERVICE_PROPERTY_META_KEY"
);

export const META_KEYS = {
  CONNECTION_PROPERTIES: Symbol("connection:properties"),
  TRANSACTIONAL_METHOD: Symbol("transactional:method"),
  TRANSACTIONAL_CLASS: Symbol("transactional:class")
};

export const DATABASE_CONFIGS_REGISTRY_KEY = Symbol("database:config:registry");
