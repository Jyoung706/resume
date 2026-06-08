"""
로컬 LLM Actor (Ray 없이 동작)

tts_workflow.app.ray.actor.llm_actor.LLMActor의 핵심 로직을
Ray 의존성 없이 로컬에서 실행할 수 있도록 재구성.

Workers (GeneralLLM 등)의 llm_actor.llm_chain_calls.remote() 호출과
호환되도록 _RemoteCallable 프록시 제공.

기존 흐름:
  Worker → get_llm_actor() → Ray ActorHandle
         → llm_chain_calls.remote() → (Ray IPC) → LLMActor
         → AsyncRedisStreamHandler → Redis XADD

변경 흐름:
  Worker → get_llm_actor() → LocalLLMActor (패치됨)
         → llm_chain_calls.remote() → _RemoteCallable → 로컬 async 호출
         → AsyncSocketStreamHandler → client.send()
"""
from __future__ import annotations

import asyncio
import random
from typing import Any, Dict, List, Optional, Tuple

import httpx
from langchain_openai import ChatOpenAI

from tts_workflow.core.conf.engine_configs import ENGINE_CONFIGS


class _RemoteCallable:
    """
    Ray .remote() 호환 프록시

    Workers가 `await llm_actor.llm_chain_calls.remote(...)` 형태로
    호출하는 것을 로컬 async 호출로 변환.
    """

    def __init__(self, bound_method):
        self._method = bound_method

    def remote(self, *args, **kwargs):
        """Ray ObjectRef 대신 coroutine 반환 (await 가능)"""
        return self._method(*args, **kwargs)


class LocalLLMActor:
    """
    LLM 인스턴스 관리 (로컬 버전)

    LLMActor와 동일한 인터페이스이지만 Ray 없이 동작.
    - engine_name + api_key 조합별 인스턴스 캐싱
    - httpx 연결 재사용
    - AsyncSocketStreamHandler 사용 (Redis 대체)
    """

    name: str = "LocalLLMActor"

    def __init__(self):
        self._pool: Dict[str, ChatOpenAI] = {}
        self._http_async_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        )

    @property
    def llm_chain_calls(self) -> _RemoteCallable:
        """Workers가 llm_actor.llm_chain_calls.remote(...)로 호출"""
        return _RemoteCallable(self._llm_chain_calls)

    # ──────────────────────────────────────────────
    # Model Pool
    # ──────────────────────────────────────────────

    def _make_key(
        self,
        engine_name: str,
        api_key: str,
        reasoning_effort: Optional[str] = None,
        text_verbosity: Optional[str] = None,
    ) -> str:
        # reasoning_effort/text_verbosity 는 생성 시점에 박히는 파라미터(bind 불가)이므로
        # 캐시 키에 포함해 인스턴스를 분리한다. 미포함 시 먼저 만들어진 인스턴스(예: 제목
        # 생성의 reasoning 없는 gpt-5)가 풀에 캐싱돼 이후 minimal 요청을 덮어쓴다(풀 오염).
        # cloud llm_actor 의 "reasoning_effort 는 풀 키에 포함됨" 주석 의도를 실제 구현.
        return f"{engine_name}:{api_key[-8:]}:{reasoning_effort}:{text_verbosity}"

    def _create_model(
        self,
        engine_name: str,
        api_key: str,
        reasoning_effort: Optional[str] = None,
        text_verbosity: Optional[str] = None,
    ) -> ChatOpenAI:
        """LLM 모델 생성 (LLMActor._create_model 이식)"""
        if engine_name not in ENGINE_CONFIGS:
            raise ValueError(f"Engine {engine_name} not supported")

        config = ENGINE_CONFIGS[engine_name]
        params = config["params"].copy()
        params["api_key"] = api_key

        # GPT-5 시리즈 특수 처리
        if engine_name.startswith("gpt-5"):
            if not engine_name.startswith("gpt-5.2"):
                params.pop("temperature", None)
                if reasoning_effort == "none":
                    reasoning_effort = "minimal"
            if reasoning_effort:
                params["reasoning"] = {"effort": reasoning_effort}
            if text_verbosity:
                params["model_kwargs"] = {"text": {"verbosity": text_verbosity}}

        model = config["constructor"](
            **params, http_async_client=self._http_async_client
        )
        return model

    def get(
        self,
        engine_name: str,
        api_key: str,
        reasoning_effort: Optional[str] = None,
        text_verbosity: Optional[str] = None,
    ) -> ChatOpenAI:
        """LLM 인스턴스 조회/생성 (캐싱)"""
        key = self._make_key(engine_name, api_key, reasoning_effort, text_verbosity)
        if key not in self._pool:
            self._pool[key] = self._create_model(
                engine_name, api_key, reasoning_effort, text_verbosity
            )
        return self._pool[key]

    # ──────────────────────────────────────────────
    # LLM Chain Calls (LLMActor.llm_chain_calls 이식)
    # ──────────────────────────────────────────────

    async def _llm_chain_calls(
        self,
        template_name: str,
        engine_config: Dict[str, Any],
        parser_name: str,
        request_list: List[Dict[str, Any]],
        step: str,
        sampling_count: int = 1,
    ) -> List[List[Tuple]]:
        """비동기 LLM 체인 호출 (LLMActor.llm_chain_calls 동일 시그니처)"""
        from tts_workflow.core.llm.prompts import get_prompt
        from tts_workflow.core.llm.parsers import get_parser

        prompt = get_prompt(template_name)
        engine, invoke_config = self._get_llm_chain(**engine_config)
        parser = get_parser(parser_name)

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

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                raise result

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
        max_output_token: Optional[int] = None,
        reasoning_effort: Optional[str] = None,
        text_verbosity: Optional[str] = None,
        streaming: bool = False,
        chat_id: Optional[str] = None,
        proc_id: Optional[int] = None,
    ) -> Tuple[Any, Dict]:
        """LLM 체인 설정 (LLMActor._get_llm_chain 이식, Redis → Socket)"""
        from tts_workflow.core.transport.stream_handler import AsyncTransportStreamHandler

        model = self.get(engine_name, api_key, reasoning_effort, text_verbosity)

        bind_kwargs = {}
        if not engine_name.startswith("gpt-5"):
            bind_kwargs["temperature"] = temperature if temperature is not None else 0
        if max_output_token is not None:
            bind_kwargs["max_tokens"] = max_output_token

        invoke_config = {}
        if streaming and chat_id is not None and proc_id is not None:
            invoke_config = {
                "callbacks": [AsyncTransportStreamHandler(proc_id, chat_id)]
            }
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
        invoke_config: Optional[Dict] = None,
        max_attempts: int = 3,
        backoff_base: int = 1,
        jitter_max: int = 10,
    ) -> Tuple[Dict, List]:
        """비동기 LLM 체인 호출 (단일) — LLMActor._call_llm_chain 이식"""
        from tts_workflow.core.exceptions.base import LLMAPIError
        from langchain_core.exceptions import OutputParserException
        from langchain.output_parsers import OutputFixingParser
        from openai import APIStatusError, APITimeoutError

        for attempt in range(max_attempts):
            try:
                chain = prompt | engine
                llm_output = await chain.ainvoke(request_kwargs, config=invoke_config)

                if isinstance(llm_output, str):
                    if llm_output.strip() == "":
                        raise OutputParserException("Empty output")
                else:
                    content = llm_output.content
                    if isinstance(content, list):
                        content = content[-1].get("text", "")
                    if content.strip() == "":
                        raise OutputParserException("Empty output")

                output = await parser.ainvoke(llm_output)

                invoke_messages = prompt.format_messages(**request_kwargs)
                invoke_messages.append(llm_output)

                return output, invoke_messages

            except OutputParserException as e:
                new_parser = OutputFixingParser.from_llm(parser=parser, llm=engine)
                chain = prompt | engine | new_parser
                if attempt == max_attempts - 1:
                    raise LLMAPIError(f"Error in LLM Parser: {e}") from e
            except APIStatusError as e:
                raise LLMAPIError(f"Error LLM API: {e}") from e
            except APITimeoutError as e:
                if attempt < max_attempts - 1:
                    sleep_time = (backoff_base ** attempt) + random.uniform(
                        0, jitter_max
                    )
                    await asyncio.sleep(sleep_time)
                else:
                    raise LLMAPIError(
                        f"Failed to invoke the chain {attempt + 1} times.\n{type(e)} <{e}>\n"
                    ) from e
            except Exception:
                raise

    async def close(self):
        """리소스 정리"""
        self._pool.clear()
        if self._http_async_client:
            await self._http_async_client.aclose()
