"""
orkis-desktop-ai 진입점

uvicorn + FastAPI로 HTTP 요청 수신.
소켓 클라이언트로 Electron 메인 프로세스에 이벤트 전송.
"""
import os
from dotenv import load_dotenv
load_dotenv()

if os.environ.get("DEBUG_MODE") == "true":
    import debugpy
    debugpy.listen(("0.0.0.0", 5678))
    print("[AI] Debugger listening on port 5678 (attach anytime)")

from app.api.app import create_app

app = create_app()
