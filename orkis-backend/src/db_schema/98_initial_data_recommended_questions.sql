-- ========================================
-- 추천 질문 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

BEGIN;

-- ========================================
-- 추천 질문 데이터 삽입 (recommended_questions)
-- ========================================

INSERT INTO recommended_questions (
    question_no, question, category, question_type, sort_order, is_active
) VALUES
-- Knowledge 카테고리 (일반 지식)
('NO.101', '요즘 우리나라에 왜 대폭우가 많이 내릴까?', 'Knowledge', 'general', 1, true),
('NO.102', '인공지능과 머신러닝의 차이점이 무엇인가요?', 'Knowledge', 'general', 2, true),
('NO.103', '양자컴퓨터가 기존 컴퓨터와 다른 점은?', 'Knowledge', 'general', 3, true),
('NO.104', 'ESG 경영이란 무엇인가요?', 'Knowledge', 'general', 4, true),

-- Image 카테고리 (이미지 생성)
('NO.201', '내 사진을 지브리 스타일의 이미지로 생성해줘', 'Image', 'general', 5, true),
('NO.202', '귀여운 고양이 캐릭터 일러스트를 그려줘', 'Image', 'general', 6, true),
('NO.203', '미래 도시 배경 이미지를 생성해줘', 'Image', 'general', 7, true),

-- Coding 카테고리 (코딩 지원)
('NO.301', '아이폰 13 이상에서 동작하는 가계부 앱을 파이썬을 이용해서 만들어줘', 'Coding', 'general', 8, true),
('NO.302', 'React로 할 일 관리 앱을 만들어줘', 'Coding', 'general', 9, true),
('NO.303', 'TypeScript로 REST API 서버를 만들어줘', 'Coding', 'general', 10, true),
('NO.304', 'Python으로 웹 스크래퍼를 작성해줘', 'Coding', 'general', 11, true),

-- Data 카테고리 (데이터 분석)
('NO.401', '2024년 매출 데이터를 분석해줘', 'Data', 'data', 12, true),
('NO.402', '고객 데이터에서 패턴을 찾아줘', 'Data', 'data', 13, true),
('NO.403', 'CSV 파일을 JSON으로 변환해줘', 'Data', 'data', 14, true),
('NO.404', '시계열 데이터의 트렌드를 분석해줘', 'Data', 'data', 15, true),

-- SQL 카테고리 (SQL 쿼리)
('NO.501', '사용자 테이블에서 최근 가입자 10명을 조회해줘', 'SQL', 'sql', 16, true),
('NO.502', '월별 매출 통계를 집계하는 쿼리를 작성해줘', 'SQL', 'sql', 17, true),
('NO.503', '중복된 이메일 주소를 찾는 쿼리를 만들어줘', 'SQL', 'sql', 18, true),
('NO.504', '주문 테이블과 고객 테이블을 조인해서 분석해줘', 'SQL', 'sql', 19, true),
('NO.505', '최근 30일간 활성 사용자 수를 계산해줘', 'SQL', 'sql', 20, true),

-- Finance 카테고리 (금융 분석)
('NO.601', '자금세탁방지(AML) 규정에 대해 설명해줘', 'Finance', 'finance', 21, true),
('NO.602', 'KYC 프로세스를 분석해줘', 'Finance', 'finance', 22, true),
('NO.603', '이상거래 탐지 기준을 알려줘', 'Finance', 'finance', 23, true)

ON CONFLICT DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '추천 질문 초기 데이터 삽입 완료';
    RAISE NOTICE '- Knowledge: 4개';
    RAISE NOTICE '- Image: 3개';
    RAISE NOTICE '- Coding: 4개';
    RAISE NOTICE '- Data: 4개';
    RAISE NOTICE '- SQL: 5개';
    RAISE NOTICE '- Finance: 3개';
END $$;
