from core.server.application.AbstractServerApplication import AbstractServerApplication
from app.routers import router
from core.utils.LogUtil import LogUtil


class ServerApplication(AbstractServerApplication):
    def __init__(self, *arg, **kwargs):
        super().__init__(*arg, **kwargs)
        try:
            self.addRouters()
            self.addListeners()
            self.exceptionHandler()
            # set application context
            self.app.context = self

        except Exception as e:
            LogUtil.error(e)

    def addRouters(self):
        self.app.include_router(router)

    def addListeners(self):
        pass

    def beforeInitRoutersHandler(self):
        pass

    def afterInitListenersHandler(self):
        pass

    def serverStartedHandler(self):
        pass
