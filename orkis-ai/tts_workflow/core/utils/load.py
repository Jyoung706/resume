import importlib
from typing import Any


# [CHECK] global 이런거 import 못하게 막아두자
def import_module(import_path: str, root_import_path: str = "") -> Any:
    if import_path.startswith("::") and import_path.endswith("::"):
        import_path = import_path.strip(
            "::"
        )  # "::mypkg.module.Class::" → "mypkg.module.Class"
    elif root_import_path:
        root_import_path = root_import_path.rstrip(".")
        import_path = f"{root_import_path}.{import_path}"

    try:
        module_path, attr_name = import_path.rsplit(".", 1)
    except ValueError:
        raise ValueError(f"Invalid import path: '{import_path}' (expected dotted path)")

    try:
        module = importlib.import_module(module_path)
    except ImportError as e:
        raise ImportError(f"Could not import module '{module_path}': {e}") from e

    try:
        return getattr(module, attr_name)
    except AttributeError as e:
        raise AttributeError(
            f"Module '{module_path}' has no attribute '{attr_name}'"
        ) from e
