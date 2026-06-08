
from enum import StrEnum, IntEnum, unique


@unique
class EDGE_TYPE(StrEnum):
    normal = "normal"
    conditional = "conditional"
    recursive = "recursive"

@unique
class NODE(StrEnum):
    # 로직에 사용되는 주요 노드 명
    intent="intent_classifier"
    final="final"

@unique
class GRAPH_STAT_TYPE(StrEnum):
    # langgrah 상태 추적 용 타입
    checkpoint=""
    start="task"
    end="task_result"

@unique
class RESULT_CODE(IntEnum):
    # 최종 결과 코드
    SUCCESS=9000        # 정상종료
    CANCLE=9001         # 사용자취소 종료
    JOB_FORCE=9002      # JOB 강제 종료
    ERROR=9003          # 오류 종료
    PREPROCESSING_NOT_COMPLETED=9004          # 프리프로세싱 미진행/진행중 오류
