from .LogUtil import LogUtil as logger


class CommonUtil:
    @staticmethod
    def printArgsKwargs(*args, **kwargs):
        try:
            if args is not None and len(args) > 0:
                for i, arg in enumerate(args):
                    logger.debug(f"[{i}] : {arg}")

            if kwargs is not None and any(kwargs) is True:
                for key, value in kwargs.items():
                    logger.debug(f"[{key}] : {value}")

        except Exception as err:
            logger.error(err)
