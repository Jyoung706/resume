from datasketch import MinHash
from typing import List
import numpy as np

from tts_workflow.core.vector_search.exceptions import VectorSearchError
from tts_workflow.core.vector_search.executor.base_executor import BaseReader
from tts_workflow.core.vector_search.executor.env_schema import OpenaiAPIEnv
from tts_workflow.app.utils.logger.exec_logger import exec_logger
from tts_workflow.core.vector_search.constants import ENCODING_TYPE


class MinhashVectorizer(BaseReader):
    _num_perm: int = 128      # signature_size: MinHash permutation 수
    _ngram_size: int = 3      # n_gram: Character n-gram 크기
    _encoding: str = ENCODING_TYPE.UTF8  # encoding: 문자열 인코딩

    def _setup(self) -> None:
        pass

    def close(self) -> None:
        pass

    def embedding(
        self,
        queries: List[str]
    ) -> List[List[float]]:
        
        vectors = []
        for query in queries:
            mh = self._create_minhash(query)

            # hashvalues를 float 벡터로 변환
            vec = np.array(mh.hashvalues, dtype=np.float32)

            # L2 정규화
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm

            vectors.append(vec.tolist())

        return vectors
    
    def _create_minhash(self, text: str) -> MinHash:
        """
        문자열에서 MinHash 생성

        기존 DuckDBLSHRepository._create_minhash() 로직 재사용
        - 짧은 문자열 폴백 처리 포함
        """
        m = MinHash(num_perm=self._num_perm)

        # 전처리
        text = text.lower().strip()

        # 짧은 문자열 폴백
        if len(text) < self._ngram_size:
            if text:  # 빈 문자열 체크
                m.update(text.encode(self._encoding))
        else:
            # n-gram 생성
            for i in range(len(text) - self._ngram_size + 1):
                n_gram = text[i:i + self._ngram_size]
                m.update(n_gram.encode(self._encoding))

        return m

    @property
    def num_perm(self) -> int:
        """벡터 차원 (MinHash permutation 수)"""
        return self._num_perm

    @property
    def ngram_size(self) -> int:
        """N-gram 크기"""
        return self._ngram_size
