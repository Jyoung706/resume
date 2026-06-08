-- ========================================
-- 키워드 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- 설명: 금융/자금세탁방지 관련 추천 키워드 및 자주 사용하는 키워드
-- ========================================

BEGIN;

-- ========================================
-- 키워드 삽입 (keywords)
-- ========================================

INSERT INTO keywords (text, type, category, user_id, knowledge_base_id, usage_count) VALUES
-- 1. 자금세탁방지(AML) 관련 추천 키워드
('자금세탁방지', 'recommended', 'aml', NULL, 'kb-finance-aml', 125),
('고객확인제도', 'recommended', 'aml', NULL, 'kb-finance-aml', 98),
('의심거래보고', 'recommended', 'reporting', NULL, 'kb-finance-aml', 87),
('KYC', 'recommended', 'compliance', NULL, 'kb-finance-aml', 156),
('고위험고객', 'recommended', 'risk', NULL, 'kb-finance-aml', 134),
('FATF 권고안', 'recommended', 'compliance', NULL, 'kb-finance-aml', 92),
('금융정보분석원', 'recommended', 'reporting', NULL, 'kb-finance-aml', 67),
('정치적 주요인물', 'recommended', 'customer', NULL, 'kb-finance-aml', 78),
('PEP', 'recommended', 'customer', NULL, 'kb-finance-aml', 143),
('고액현금거래보고', 'recommended', 'reporting', NULL, 'kb-finance-aml', 95),

-- 2. 자주 사용하는 키워드 (frequent)
('거래모니터링', 'frequent', 'transaction', NULL, 'kb-finance-aml', 203),
('실소유자', 'frequent', 'customer', NULL, 'kb-finance-aml', 178),
('위험평가', 'frequent', 'risk', NULL, 'kb-finance-aml', 145),
('STR', 'frequent', 'reporting', NULL, 'kb-finance-aml', 189),
('CTR', 'frequent', 'reporting', NULL, 'kb-finance-aml', 167),

-- 3. 추가 추천 키워드 (금융 관련)
('고객실사', 'recommended', 'compliance', NULL, 'kb-finance-aml', 112),
('단순화된 실사', 'recommended', 'compliance', NULL, 'kb-finance-aml', 65),
('강화된 실사', 'recommended', 'compliance', NULL, 'kb-finance-aml', 89),
('거래목적 확인', 'recommended', 'transaction', NULL, 'kb-finance-aml', 76),
('자금출처 확인', 'recommended', 'transaction', NULL, 'kb-finance-aml', 94),

-- 4. 컴플라이언스 관련 키워드
('제재대상자', 'recommended', 'compliance', NULL, 'kb-finance-aml', 88),
('블랙리스트', 'recommended', 'risk', NULL, 'kb-finance-aml', 71),
('화이트리스트', 'recommended', 'risk', NULL, 'kb-finance-aml', 52),
('명단 대조', 'recommended', 'compliance', NULL, 'kb-finance-aml', 103),
('경제 제재', 'recommended', 'compliance', NULL, 'kb-finance-aml', 79),

-- 5. 거래 관련 키워드
('이상거래탐지', 'frequent', 'transaction', NULL, 'kb-finance-aml', 134),
('현금거래', 'recommended', 'transaction', NULL, 'kb-finance-aml', 98),
('외환거래', 'recommended', 'transaction', NULL, 'kb-finance-aml', 87),
('자금이체', 'recommended', 'transaction', NULL, 'kb-finance-aml', 102),
('송금', 'recommended', 'transaction', NULL, 'kb-finance-aml', 117),

-- 6. 리스크 관련 키워드
('위험기반 접근법', 'recommended', 'risk', NULL, 'kb-finance-aml', 91),
('고위험국가', 'recommended', 'risk', NULL, 'kb-finance-aml', 106),
('고위험업종', 'recommended', 'risk', NULL, 'kb-finance-aml', 84),
('리스크평가', 'frequent', 'risk', NULL, 'kb-finance-aml', 127),

-- 7. 보고 관련 키워드
('특정금융거래정보', 'recommended', 'reporting', NULL, 'kb-finance-aml', 73),
('FIU', 'recommended', 'reporting', NULL, 'kb-finance-aml', 82),
('의무보고', 'recommended', 'reporting', NULL, 'kb-finance-aml', 69),
('보고시한', 'recommended', 'reporting', NULL, 'kb-finance-aml', 58),

-- 8. 금융 일반 키워드
('금융기관', 'recommended', 'finance', NULL, 'kb-finance-aml', 95),
('은행', 'recommended', 'finance', NULL, 'kb-finance-aml', 108),
('증권', 'recommended', 'finance', NULL, 'kb-finance-aml', 76),
('보험', 'recommended', 'finance', NULL, 'kb-finance-aml', 64),
('가상자산', 'frequent', 'finance', NULL, 'kb-finance-aml', 142),

-- 9. 고객 관련 키워드
('법인고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 89),
('개인고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 97),
('신규고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 85),
('기존고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 71),
('비대면고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 103)

ON CONFLICT DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '키워드 초기 데이터 삽입 완료';
    RAISE NOTICE '- 추천 키워드(recommended): 40개';
    RAISE NOTICE '- 자주 사용 키워드(frequent): 9개';
    RAISE NOTICE '- 카테고리: aml, compliance, risk, reporting, transaction, finance, customer';
END $$;
