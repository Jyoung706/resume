from langchain_openai import ChatOpenAI
from typing import Dict, Any
"""
This module defines configurations for various language models using the langchain library.
Each configuration includes a constructor, parameters, and an optional preprocessing function.
"""

ENGINE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "gpt-3.5": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-3.5-turbo-0125", "temperature": 0},
    },
    "gpt-3.5-turbo-instruct": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-3.5-turbo-instruct", "temperature": 0},
    },
    "gpt-4-1106-preview": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-4-1106-preview", "temperature": 0},
    },
    "gpt-4-0125-preview": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-4-0125-preview", "temperature": 0},
    },
    "gpt-4": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-4-turbo", "temperature": 0},
    },
    "gpt-4o": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-4o", "temperature": 0},
    },
    "gpt-4o-mini": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-4o-mini", "temperature": 0},
    },
    "gpt-5": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-5-2025-08-07"},
    },
    "gpt-5-mini": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-5-mini-2025-08-07"},
    },
    "gpt-5-nano": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-5-nano-2025-08-07"},
    },
    "gpt-5.2": {
        "constructor": ChatOpenAI,
        "params": {"model": "gpt-5.2-2025-12-11"},
    },
}
