class ListUtil:
    @staticmethod
    def list_yield_call(_item: list, func: callable):
        for value in _item:
            yield func(value)
