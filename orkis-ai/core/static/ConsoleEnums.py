from enum import StrEnum, unique, Enum

# \033[  =  \xb1[  =  \u001b[


class ConsoleTextColor(StrEnum):
    """
    ANSI support console text color enum
    """

    reset = "\033[0m"
    nomal = ""
    black = "\033[30m"
    red = "\033[31m"
    green = "\033[32m"
    yellow = "\033[33m"
    blue = "\033[34m"
    magenta = "\033[35m"
    cyan = "\033[36m"
    white = "\033[37m"
    brite_black = "\033[90m"
    brite_red = "\033[91m"
    brite_green = "\033[92m"
    brite_yellow = "\033[93m"
    brite_blue = "\033[94m"
    brite_magenta = "\033[95m"
    brite_cyan = "\033[96m"
    brite_white = "\033[97m"


class ConsoleBackColor(StrEnum):
    """
    ANSI support console text background color enum
    """

    reset = "\033[0m"
    nomal = ""
    black = "\033[40m"
    red = "\033[41m"
    green = "\033[42m"
    yellow = "\033[43m"
    blue = "\033[44m"
    magenta = "\033[45m"
    cyan = "\033[46m"
    white = "\033[47m"
    brite_black = "\033[100m"
    brite_red = "\033[101m"
    brite_green = "\033[102m"
    brite_yellow = "\033[103m"
    brite_blue = "\033[104m"
    brite_magenta = "\033[105m"
    brite_cyan = "\033[106m"
    brite_white = "\033[107m"
