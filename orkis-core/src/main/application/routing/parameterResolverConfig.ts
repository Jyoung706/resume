import { REQUEST_ARG_TYPE } from "../../core/constants";
import { Request } from "../types";

interface ParameterMeta {
  index: number;
  type: REQUEST_ARG_TYPE;
  key?: string;
  fieldName?: string;
}
interface ResolverContext {
  req: Request;
  res: Response;
  meta: ParameterMeta;
  [key: string]: any;
}

export type ParameterResolver = (ctx: ResolverContext) => any;

export const PARAMETER_RESOLVER_CONFIG: Record<
  REQUEST_ARG_TYPE,
  ParameterResolver
> = {
  [REQUEST_ARG_TYPE.BODY]: (ctx) => ctx.req.body,

  [REQUEST_ARG_TYPE.QUERY]: (ctx) =>
    ctx.meta.key ? ctx.req.query?.[ctx.meta.key] : ctx.req.query,

  [REQUEST_ARG_TYPE.PARAM]: (ctx) =>
    ctx.meta.key
      ? (ctx.req.body?.[ctx.meta.key] ??
        ctx.req.query?.[ctx.meta.key] ??
        ctx.req.params?.[ctx.meta.key])
      : ctx.req.params,

  [REQUEST_ARG_TYPE.HEADERS]: (ctx) =>
    ctx.meta.key
      ? ctx.req.headers?.[ctx.meta.key.toLowerCase()]
      : ctx.req.headers,

  [REQUEST_ARG_TYPE.SESSION]: (ctx) =>
    ctx.meta.key ? ctx.req.session?.[ctx.meta.key] : ctx.req.session,

  [REQUEST_ARG_TYPE.REQUEST]: (ctx) => ctx.req,

  [REQUEST_ARG_TYPE.RESPONSE]: (ctx) => ctx.res,

  [REQUEST_ARG_TYPE.FILES]: (ctx) => {
    if (ctx.req.files && typeof ctx.req.files === "object") {
      return (ctx.req.files as Record<string, any>)[ctx.meta.fieldName!] || [];
    }
    return [];
  },

  [REQUEST_ARG_TYPE.REQUEST_MAP]: (ctx) => ({
    ...ctx.req.body,
    ...ctx.req.query,
    ...ctx.req.params
  }),

  [REQUEST_ARG_TYPE.PART]: (ctx) => ctx.req.body?.[ctx.meta.key!],

  [REQUEST_ARG_TYPE.SSE]: (ctx) => ctx.sseHelper
} as const;
