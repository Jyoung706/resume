import { Request } from "../../main/application";
import {
  FILTER_TYPES,
  REQUEST_METHOD,
  REQUEST_TYPE
} from "../../main/core/constants";
import {
  Autowired,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  RequestMapping,
  Sse
} from "../../main/core/decorators";
import logger from "../../main/utils";
import { SSEStream } from "../../main/utils/SSEStream";
import { TestService } from "./services/TestService";

@Controller({ path: "" })
export class TestController {
  @Autowired("TestService")
  private testService!: TestService;

  // 1. 정상 응답 테스트
  @RequestMapping({
    route: "/ok-test",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async okTest() {
    const result = await api.post("/request", {
      hobby: "fishing"
    });

    logger.info("=== 정상 응답 테스트 ===");
    logger.info("result:", result);
    return result;
  }

  // 2. 에러 응답 테스트 (400 Bad Request)
  @RequestMapping({
    route: "/ok-error-test",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async okErrorTest() {
    const result = await api.get("/error/400");

    logger.info("=== 400 에러 응답 테스트 ===");
    logger.info("result:", result);
    logger.info("result.ok:", result.ok);
    logger.info("result.status:", result.status);
    logger.info("result.statusText:", result.statusText);
    logger.info("result.data:", result.data);
    logger.info(Object.fromEntries(result.headers));
    return result;
  }

  // 3. 에러 응답 테스트 (500 Internal Server Error)
  @RequestMapping({
    route: "/ok-500-test",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async ok500Test() {
    const result = await api.get("/error/500");

    logger.info("=== 500 에러 응답 테스트 ===");
    logger.info("result:", result);
    logger.info("result.ok:", result.ok);
    logger.info("result.status:", result.status);
    logger.info("result.data:", result.data);
    logger.info("result.headers: ", result.headers);
    return result;
  }

  // 4. 404 Not Found 테스트
  @RequestMapping({
    route: "/ok-404-test",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async ok404Test() {
    const result = await api.get("/not-exist-endpoint");

    logger.info("=== 404 에러 응답 테스트 ===");
    logger.info("result:", result);
    logger.info("result.ok:", result.ok);
    logger.info("result.status:", result.status);
    logger.info("result.data:", result.data);
    return result;
  }

  // 5. SSE 스트림 요청 테스트
  @RequestMapping({
    route: "/ok-sse-test",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async okSseTest() {
    const result = await api.get("/sse-endpoint", {
      responseType: "stream"
    });

    logger.info("=== SSE 스트림 응답 테스트 ===");
    logger.info("result.ok:", result.ok);
    logger.info("result.status:", result.status);
    logger.info("result.data (stream):", result.data);

    // 스트림 데이터 읽기
    if (result.ok && result.data) {
      const reader = (result.data as ReadableStream).getReader();
      const decoder = new TextDecoder();

      let chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        logger.info("SSE chunk:", chunk);
        chunks.push(chunk);
      }

      return { ok: result.ok, status: result.status, sseData: chunks };
    }

    return result;
  }

  // === 테스트용 엔드포인트들 ===

  @RequestMapping({
    route: "/new",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async requestLoggerTest(@Req() req: Request) {
    logger.info(req.context.user);
    return "Hello World";
  }

  @RequestMapping({
    route: "/request",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async requestTest(@Body() body: any) {
    const data = {
      name: "lll",
      age: "12",
      ...body
    };
    return data;
  }

  // 400 에러 반환 엔드포인트
  @RequestMapping({
    route: "/error/400",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async error400(@Query("message") message?: string) {
    const error = new Error("Bad Request");
    (error as any).statusCode = 400;
    (error as any).body = {
      error: "Bad Request",
      message: message || "잘못된 요청입니다",
      code: "INVALID_REQUEST"
    };
    throw error;
  }

  // 500 에러 반환 엔드포인트
  @RequestMapping({
    route: "/error/500",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async error500(@Req() req: Request) {
    logger.info(req.context.user);
    const error: any = new Error("500 에러 테스트");
    error.statusCode = 500;
    throw error;
  }

  // SSE 스트림 엔드포인트
  @RequestMapping({
    route: "/sse-endpoint",
    method: REQUEST_METHOD.GET,
    requestType: REQUEST_TYPE.SSE,
    filteredType: FILTER_TYPES.NONE
  })
  async sseEndpoint(@Sse sse: SSEStream) {
    if (!sse) {
      logger.info("SSE 객체가 undefined입니다!");
      return;
    }

    // 테스트용 SSE 이벤트 전송
    logger.info("SSE 이벤트 전송 시작");
    sse.send({ event: "start", data: { message: "SSE 시작" } });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    sse.send({ event: "data", data: { count: 1 } });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    sse.send({ event: "data", data: { count: 2 } });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    sse.send({ event: "end", data: { message: "SSE 종료" } });

    logger.info("SSE 이벤트 전송 완료, close 호출");
    sse.close();
  }

  @Post("new")
  async createUser(@Body() body: { name: string; age: number }) {
    const newUser = await this.testService.createUser(body);
    return {
      sucess: true,
      data: newUser
    };
  }

  @Get("all")
  async getAllUser() {
    const allUserInfo = await this.testService.getAllUserInfo();

    return {
      success: true,
      data: allUserInfo
    };
  }
}
