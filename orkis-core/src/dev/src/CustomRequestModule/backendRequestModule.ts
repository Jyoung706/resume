import { HttpModule } from "../../../main/utils";

export const backApi = new HttpModule({
  baseURL: "http://localhost:8080",
  connections: 100
});

backApi.beforeIntercept(async (url, init) => {
  init.headers = {
    ...init.headers,
    "X-Request-Id": crypto.randomUUID()
  };
  return { url, init };
});

backApi.afterIntercept(async (res, req) => {
  console.log(`[Response] ${req.init.method} ${req.url} - ${res.status}`);
  return res;
});
