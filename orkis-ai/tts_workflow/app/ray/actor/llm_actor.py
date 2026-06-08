import ray
import httpx
import asyncio
import random
from typing import Any, Dict, List, Tuple
from langchain_openai import ChatOpenAI

from tts_workflow.core.conf.engine_configs import ENGINE_CONFIGS
from tts_workflow.core.ray.actor.resource_actor import ResourceActor
from tts_workflow.core.conf.ray_config import ray_config
from tts_workflow.app.utils.logger.exec_logger import exec_logger


@ray.remote(
    num_cpus=ray_config.LLM_ACTOR_NUM_CPUS,
    memory=ray_config.LLM_ACTOR_MEMORY_MB * 1024 * 1024
)
class LLMActor(ResourceActor):
    """
    LLM 인스턴스 관리 Actor (Async)

    - engine_name + api_key 조합별 인스턴스 캐싱
    - LRU + TTL 기반 Pool (max 5, TTL 30분)
    - httpx 연결 재사용
    - Native async (ainvoke) 사용
    """
    _name: str = "LLMActor"

    def __init__(
        self,
        max_pool_size: int = 5,
        ttl_seconds: float = 1800.0  # 30분
    ):
        super().__init__(max_pool_size, ttl_seconds)
        # 공유 비동기 HTTP 클라이언트 (ainvoke에서 사용)
        self._http_async_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
        )

        exec_logger.info(f"{self.name} initialized: http_async_client with connection pooling")

    def _create_model(
        self,
        engine_name: str,
        api_key: str,
        reasoning_effort: str = None,
        text_verbosity: str = None
    ) -> ChatOpenAI:
        """LLM 모델 생성"""
        if engine_name not in ENGINE_CONFIGS:
            raise ValueError(f"Engine {engine_name} not supported")

        config = ENGINE_CONFIGS[engine_name]

        # 중요: 원본 params를 수정하지 않도록 복사본 사용
        params = config["params"].copy()
        params["api_key"] = api_key

        # GPT-5 시리즈 특수 처리
        if engine_name.startswith("gpt-5"):
            # GPT-5.2 이외에는 temperature 제거
            if not engine_name.startswith("gpt-5.2"):
                params.pop("temperature", None)
                # gpt-5 (non-5.2)는 'none'을 지원하지 않으므로 'minimal'로 매핑
                if reasoning_effort == "none":
                    reasoning_effort = "minimal"
            # reasoning_effort, text_verbosity는 생성 시 설정 (풀 키에 포함됨)
            if reasoning_effort:
                params['reasoning'] = {"effort": reasoning_effort}
            if text_verbosity:
                params['model_kwargs'] = {"text": {"verbosity": text_verbosity}}

        model = config["constructor"](**params, http_async_client=self._http_async_client)

        exec_logger.info(f"{self.name}: Created model {engine_name}")
        return model

    def get(
        self,
        engine_name: str,
        api_key: str,
        reasoning_effort: str = None,
        text_verbosity: str = None
    ) -> Any:
        """
        LLM 인스턴스 조회/생성

        Args:
            engine_name: 엔진 이름 (gpt-4o, gpt-5 등)
            api_key: OpenAI API 키
            reasoning_effort: GPT-5 reasoning effort
            text_verbosity: GPT-5 text verbosity

        Returns:
            ChatOpenAI 인스턴스 (직렬화된 형태)
        """
        key = self._make_key(engine_name=engine_name, api_key=api_key)

        model = self._pool.get_or_create(
            key,
            factory=lambda: self._create_model(
                engine_name, api_key, reasoning_effort, text_verbosity
            )
        )

        return model

    async def llm_chain_calls(
        self,
        template_name: str,
        engine_config: Dict[str, Any],
        parser_name: str,
        request_list: List[Dict[str, Any]],
        step: str,
        sampling_count: int = 1
    ) -> List[List[Dict]]:
        """
        비동기 LLM 체인 호출 (Native Async)

        asyncio.gather로 병렬 실행, chain.ainvoke() 사용.
        """
        from tts_workflow.core.llm.prompts import get_prompt
        from tts_workflow.core.llm.parsers import get_parser

        prompt = get_prompt(template_name)
        engine, invoke_config = self._get_llm_chain(**engine_config)
        parser = get_parser(parser_name)

        # 비동기 태스크 생성
        tasks = []
        for request_kwargs in request_list:
            for _ in range(sampling_count):
                tasks.append(
                    self._call_llm_chain(
                        prompt=prompt,
                        engine=engine,
                        parser=parser,
                        request_kwargs=request_kwargs,
                        step=step,
                        invoke_config=invoke_config,
                    )
                )

        # 비동기 병렬 실행
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 예외 처리
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                exec_logger.error(f"Task {i} failed: {result}")
                raise result

        # 결과 그룹화 (sampling_count별)
        grouped_results = [
            results[i * sampling_count : (i + 1) * sampling_count]
            for i in range(len(request_list))
        ]

        return grouped_results

    def _get_llm_chain(
        self,
        engine_name: str,
        api_key: str,
        temperature: float = 0,
        max_output_token: int = None,
        reasoning_effort: str = None,
        text_verbosity: str = None,
        streaming: bool = False,
        chat_id: str = None,
        proc_id: int = None,
    ) -> Tuple[Any, Dict]:
        """
        LLM 체인 설정

        AsyncCallbackHandler를 사용하여 비동기 콜백 처리.
        """
        from tts_workflow.core.llm.model_handler import AsyncRedisStreamHandler

        model = self.get(engine_name, api_key, reasoning_effort, text_verbosity)

        # bind()로 모델 파라미터만 설정
        bind_kwargs = {}
        if not engine_name.startswith("gpt-5"):
            bind_kwargs["temperature"] = temperature if temperature is not None else 0
        if max_output_token is not None:
            bind_kwargs["max_tokens"] = max_output_token

        # streaming과 callbacks는 함께 설정 (같은 조건)
        invoke_config = {}
        if streaming and chat_id is not None and proc_id is not None:
            invoke_config = {"callbacks": [AsyncRedisStreamHandler(proc_id, chat_id)]}
            bind_kwargs["stream"] = True

        if bind_kwargs:
            model = model.bind(**bind_kwargs)

        return model, invoke_config

    async def _call_llm_chain(
        self,
        prompt: Any,
        engine: Any,
        parser: Any,
        request_kwargs: Dict[str, Any],
        step: str,
        invoke_config: Dict = None,
        max_attempts: int = 3,
        backoff_base: int = 1,
        jitter_max: int = 10,
    ) -> Tuple[Dict, List]:
        """
        비동기 LLM 체인 호출 (단일)

        chain.ainvoke()와 parser.ainvoke() 사용.
        """
        from tts_workflow.core.exceptions.base import LLMAPIError, RedisError, UnkownError
        from langchain_core.exceptions import OutputParserException
        from langchain.output_parsers import OutputFixingParser
        from openai import APIStatusError, APITimeoutError

        for attempt in range(max_attempts):
            try:
                chain = prompt | engine

                # 비동기 호출
                llm_output = await chain.ainvoke(request_kwargs, config=invoke_config)

                if isinstance(llm_output, str):
                    if llm_output.strip() == "":
                        raise OutputParserException("Empty output")
                else:
                    content = llm_output.content
                    if isinstance(content, list):
                        content = content[-1].get('text', '')
                    if content.strip() == "":
                        raise OutputParserException("Empty output")

                # 비동기 파서 호출
                output = await parser.ainvoke(llm_output)

                invoke_messages = prompt.format_messages(**request_kwargs)
                invoke_messages.append(llm_output)

                return output, invoke_messages

            except OutputParserException as e:
                exec_logger.warning(f"OutputParserException: {e}")
                new_parser = OutputFixingParser.from_llm(parser=parser, llm=engine)
                chain = prompt | engine | new_parser
                if attempt == max_attempts - 1:
                    raise LLMAPIError(f"Error in LLM Parser: {e}") from e
            except APIStatusError as e:
                raise LLMAPIError(f"Error LLM API: {e}") from e
            except APITimeoutError as e:
                if attempt < max_attempts - 1:
                    exec_logger.warning(
                        f"Failed to invoke the chain {attempt + 1} times.\n{type(e)}\n{e}"
                    )
                    sleep_time = (backoff_base ** attempt) + random.uniform(0, jitter_max)
                    await asyncio.sleep(sleep_time)  # 비동기 sleep
                else:
                    raise LLMAPIError(f"Failed to invoke the chain {attempt + 1} times.\n{type(e)} <{e}>\n") from e
            except RedisError as e:
                raise
            except Exception as e:
                import traceback
                exec_logger.error(f"Unexpected error: {type(e).__name__}: {e}")
                exec_logger.error(traceback.format_exc())
                raise UnkownError() from e

    def cleanup(self) -> None:
        """리소스 정리"""
        self._pool.clear()
        if self._http_async_client:
            asyncio.get_event_loop().run_until_complete(self._http_async_client.aclose())
        exec_logger.info(f"{self.name}: Cleanup complete")
