from .LogUtil import LogUtil
from ..static.ConsoleEnums import ConsoleTextColor, ConsoleBackColor


class ConsoleUtil:
    @staticmethod
    def colorTextGen(
        text: str,
        color: ConsoleTextColor = ConsoleTextColor.nomal,
        back_color: ConsoleBackColor = ConsoleBackColor.nomal,
    ):
        colorOpt = f"{color}{back_color}"
        preStr = "" if colorOpt == " " else colorOpt
        resetOption = "" if colorOpt == " " else ConsoleTextColor.reset
        return f"{preStr}{text}{resetOption}"

    # '\x1b[90m \n         |=========================================================|\n        \x1b[0m |
    # \x1b[34m BiTTS Api Server\x1b[0m \x1b[93m 0.0.1\x1b[0m                     |\n         |
    # \x1b[94m Beomik LLM, sLLM SQL Generation Service\x1b[0m     |\n        \x1b[90m |=========================================================|\n        \x1b[0m'
