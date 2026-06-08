def startServer():
    from app.ServerApplication import ServerApplication
    from core.conf import config

    ServerApplication(
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
    )()


if __name__ == "__main__":
    startServer()


# uvicorn.run(app, host='127.0.0.1', port=8000, log_level='debug')
# os.environ["ENV"] = env
# # os.environ["DEBUG"] = str(debug)
# uvicorn.run(app="app.server:app",
#             host='127.0.0.1',
#             port=8000,
#             log_level='debug')
# # uvicorn.run(
# #     app="app.server:app",
# #     host=config.APP_HOST,
# #     port=config.APP_PORT,
# #     reload=True if config.ENV != "production" else False,
# #     workers=1,
# # )
