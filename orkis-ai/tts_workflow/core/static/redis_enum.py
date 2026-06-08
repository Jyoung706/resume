
from enum import IntEnum, StrEnum, unique

# COMM REDIS ENUM
@unique
class KEYS(StrEnum):
    """
    Redis comm prefix keys
    """
    counter = "c"

    """
    Redis chat prefix keys
    """
    process = "proc"
    process_stream = "stream"
    status = "stat"

    """
    Redis stream prefix keys
    """
    streaming_end = "e"
    

@unique
class FIELDS(StrEnum):
    """
    Redis hash keys
    """
    # chat - proc
    id="id"
    stat="stat"
    msg_id="msg_id"

    # chat - stat
    
    # streaming
    msg_chunk = "m"

# CHAT REDIS ENUM
@unique
class PROC_STAT_CODE(IntEnum):
    running=0
    success=1
    fail=-1

@unique
class SERVICE_CODE(StrEnum):
    APP="0"
    AI="1"

@unique    
class STATUS_CODE(StrEnum):
    start="0"
    working="1"
    end="2"


# STREAMING ENUM
@unique
class ENTRY_CODE(StrEnum):
    # not used
    # follow redis stream entry id
    streaming="0"
    end="1" 

@unique
class STREAMING(StrEnum):
    running="0"
    end="1"
