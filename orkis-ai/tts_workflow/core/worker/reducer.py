from typing import Any, List


def add_reducer_for_str(a: str, b: str) -> str:
    return a + b


def add_reducer_for_list(a: List[Any], b: List[Any]) -> List[Any]:
    return a + b
