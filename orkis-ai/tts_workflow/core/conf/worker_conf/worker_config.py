from pydantic import BaseModel, ConfigDict, model_validator
from typing import Dict, Any, List, Optional
from langgraph.graph.state import CompiledStateGraph
from datetime import datetime

from tts_workflow.core.static.work_enum import EDGE_TYPE


class DstRcrConfig(BaseModel):
    recursive: str
    next: str
    max_retry: Optional[int] = 3


class WorkConfig(BaseModel):
    import_path: str
    streaming:bool = None
    args: Optional[Dict[str, Any]] = {}


class EdgeConfig(BaseModel):
    type: EDGE_TYPE
    src: str
    dst: Optional[str] = None
    dsts: Optional[Dict[str, str | None]] = None
    dst_rcr: Optional[DstRcrConfig] = None

    @model_validator(mode="after")
    def validate_required_fields(cls, model):
        if model.type == EDGE_TYPE.normal and model.dst is None:
            raise ValueError("dst is required for normal edge")

        if model.type == EDGE_TYPE.conditional and model.dsts is None:
            raise ValueError("dsts is required for conditional edge")

        if model.type == EDGE_TYPE.recursive and model.dst_rcr is None:
            raise ValueError("dst_rcr is required for recursive edge")

        return model


class ProcConfig(BaseModel):
    process_id: str
    works: List[str]


class WorkerConfig(BaseModel):
    worker_id: str
    root_import_path: Optional[str] = None
    works: Dict[str, WorkConfig]
    edges: List[EdgeConfig]
    procs: List[ProcConfig]


class CompiledWorker(BaseModel):
    worker: CompiledStateGraph
    builded_at: datetime = datetime.now()
    last_used_at: Optional[datetime] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )  # json 직렬화 안되더라도 상관없음
