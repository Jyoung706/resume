from .ListUtil import ListUtil
from ..pattern.BlankClass import BlankClass


class DictionaryUtil:
    @staticmethod
    def dictToObject(_dict: dict):
        obj = BlankClass()
        for key in _dict:
            item = _dict[key]
            if type(item) is dict:
                setattr(obj, key, DictionaryUtil.dictToObject(item))
            elif type(item) is list:
                setattr(
                    obj,
                    key,
                    list(ListUtil.list_yield_call(item, DictionaryUtil.dictToObject)),
                )
            else:
                setattr(obj, key, item)
        return obj

    @staticmethod
    def objectToDict(obj):
        if type(obj) is dict:
            return {key: DictionaryUtil.objectToDict(obj[key]) for key in vars(obj)}
        elif type(obj) is object or type(obj) is BlankClass:
            return {
                key: DictionaryUtil.objectToDict(getattr(obj, key)) for key in vars(obj)
            }
        elif type(obj) is list:
            return list(ListUtil.list_yield_call(obj, DictionaryUtil.objectToDict))
        else:
            return obj

    @staticmethod
    def jsonDefaultEncoder(obj):
        if isinstance(obj, object):
            return DictionaryUtil.objectToDict(obj)
        raise TypeError

    @staticmethod
    def rowToDict(row):
        d = {}
        for column in row.__table__.columns:
            d[column.name] = str(getattr(row, column.name))
        return d

    # row2dict = lambda r: {c.name: str(getattr(r, c.name)) for c in r.__table__.columns}
