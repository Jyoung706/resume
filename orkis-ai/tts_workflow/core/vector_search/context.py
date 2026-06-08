# tts_workflow/core/vector_search/context.py
"""
Executor Context Module (단순화)

- task_dict를 ContextVar에 저장
- executor 생성 및 재사용
- run() 종료 시 자동 정리
"""

import hashlib
import json
from contextvars import ContextVar
from functools import wraps
from typing import Any, Dict, Type

# task_dict를 담는 ContextVar
_current_task: ContextVar[Dict[str, Any]] = ContextVar('current_task')

# 생성된 executor들 추적 (key: str, value: executor)
_executors: ContextVar[Dict[str, Any]] = ContextVar('executors')


def _make_key(executor_cls: Type, **kwargs) -> str:
    """executor class와 env로 해시 key 생성"""
    data = {"cls": executor_cls.__name__, **kwargs}
    canonical = json.dumps(data, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


def get_task_env() -> Dict[str, Any]:
    """현재 task에서 db_id, api_key 등 가져오기"""
    task = _current_task.get(None)
    if task is None:
        raise RuntimeError("No task in context. Use @executor_scope on run()")
    return {
        "db_id": task.get("db_id"),
        "api_key": task.get("api_key"),
    }


def get_executor(executor_cls: Type, **extra_env) -> Any:
    """
    executor 획득 (같은 key면 재사용)

    Args:
        executor_cls: Executor 클래스
        **extra_env: 추가 env (path 등)
    """
    task_env = get_task_env()

    # 스키마 기반 필터링
    schema = getattr(executor_cls, '__env_schema__', None)
    if schema:
        required = schema.__required_keys__
        env = {k: v for k, v in {**task_env, **extra_env}.items() if k in required}
    else:
        env = extra_env

    key = _make_key(executor_cls, **env)

    executors = _executors.get()
    if key not in executors:
        executors[key] = executor_cls(**env)

    return executors[key]


def _close_all_executors():
    """모든 executor 정리"""
    executors = _executors.get(None)
    if executors:
        for executor in executors.values():
            try:
                executor.close()
            except Exception:
                pass
        executors.clear()


def executor_scope(func):
    """
    executor 사용자 용 데코레이터 (async 버전)
    - task_dict를 ContextVar에 저장
    - 종료 시 모든 executor close

    Note: Ray 직렬화 문제 방지를 위해 wrapper 내부에서 import
    """
    @wraps(func)
    async def wrapper(self, task_dict: Dict[str, Any], *args, **kwargs):
        # Ray 직렬화 시 ContextVar가 클로저에 캡처되지 않도록 내부에서 import
        from tts_workflow.core.vector_search.context import (
            _current_task,
            _executors,
            _close_all_executors,
        )

        task_token = _current_task.set(task_dict)
        exec_token = _executors.set({})

        # logger context 설정
        from tts_workflow.app.utils.logger.exec_logger import _logger_id

        value = next((task_dict.get(k) for k in ['chat_id', 'db_id']), None)
        logger_id_token = _logger_id.set(value)
            
        try:
            return await func(self, task_dict, *args, **kwargs)
        finally:
            _close_all_executors()
            _current_task.reset(task_token)
            _executors.reset(exec_token)
            _logger_id.reset(logger_id_token)
            
    return wrapper
