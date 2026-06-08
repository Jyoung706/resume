from typing import Dict, Type, TypeVar, get_type_hints

from tts_workflow.core.vector_search.exceptions import RegistryError
from tts_workflow.core.vector_search.service.base_service import BaseService

T = TypeVar('T')


class Registry:
    _components: Dict[Type, object] = {}

    @classmethod
    def register(cls, component_cls: Type):
        """
        구현체 클래스로 등록 (인스턴스 자동 생성)
        - Repository: 구현체 클래스로 등록
        - Service: 구현체 클래스로 등록 + 의존성 주입
        """
        if component_cls in cls._components:
            raise RegistryError(f"{component_cls.__name__} already registered")

        instance = component_cls()

        # Service는 의존성 주입
        if issubclass(component_cls, BaseService):
            cls.inject(instance)

        cls._components[component_cls] = instance

    @classmethod
    def get(cls, component_cls: Type[T]) -> T:
        """구현체 클래스로 조회"""
        if component_cls not in cls._components:
            raise RegistryError(f"{component_cls.__name__} not registered")
        return cls._components[component_cls]

    @classmethod
    def inject(cls, instance):
        """클래스 어노테이션 기반 자동 주입"""
        hints = get_type_hints(instance.__class__)
        for attr_name, attr_type in hints.items():
            if attr_type in cls._components:
                setattr(instance, attr_name, cls._components[attr_type])

    @classmethod
    def clear(cls):
        """테스트용 - 등록 초기화"""
        cls._components.clear()
