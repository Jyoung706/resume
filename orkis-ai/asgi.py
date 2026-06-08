
# import debugpy
# debugpy.listen(("0.0.0.0", 9002))
# debugpy.wait_for_client()

from tts_workflow.core.ray.actor_manager import ActorManager
ActorManager.init()

from app.ServerApplication import ServerApplication 
from core.conf import config
def create_app():
    server = ServerApplication(
            title=config.APP_NAME,
            description=config.APP_DESC,
            version=config.APP_VER,
            docs_url=None if config.ENV == "prod" else config.APP_DOC_URL,
            redoc_url=None if config.ENV == "prod" else config.APP_REDOC_URL,
            env=config.ENV,
            host=config.APP_HOST, 
            port=config.APP_PORT, 
            logLevel=config.LOG,
            # middlewares=[Middleware(RedisMiddleware)]
        )
    
    return server.app


app = create_app()
