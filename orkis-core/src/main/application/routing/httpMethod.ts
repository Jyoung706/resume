import { HttpMethod } from "../types";
import { REQUEST_METHOD } from "../../core/constants";

export const HTTP_METHOD_MAP: Record<REQUEST_METHOD, HttpMethod> = {
  [REQUEST_METHOD.GET]: "get",
  [REQUEST_METHOD.POST]: "post",
  [REQUEST_METHOD.PUT]: "put",
  [REQUEST_METHOD.PATCH]: "patch",
  [REQUEST_METHOD.DELETE]: "delete"
};

export function getHttpMethod(requestMethod: REQUEST_METHOD): HttpMethod {
  return HTTP_METHOD_MAP[requestMethod] || "post";
}
