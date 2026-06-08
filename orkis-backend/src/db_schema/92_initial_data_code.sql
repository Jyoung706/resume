-- ========================================
-- 공통코드 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- 설명: 시스템 운영에 필요한 기본 공통코드 데이터
-- ========================================

BEGIN;

-- ========================================
-- 1. 코드 그룹 삽입 (code_group)
-- ========================================
INSERT INTO code_group (group_id, group_name, description, display_order, use_yn) VALUES
('TICKET_STATUS', '문의 상태', '고객 문의 티켓 처리 상태 코드', 1, 'Y'),
('TICKET_PRIORITY', '문의 우선순위', '고객 문의 티켓 우선순위 코드', 2, 'Y'),
('TICKET_CATEGORY', '문의 카테고리', '고객 문의 유형 분류 코드', 3, 'Y'),
('HELP_CATEGORY', '도움말 카테고리', '도움말 시스템 카테고리 분류 코드', 4, 'Y'),
('KEYWORD_CATEGORY', '키워드 카테고리', '키워드 힌트 카테고리 분류 코드', 5, 'Y'),
('LOGIN_TYPE', '로그인 타입', '로그인 방식 분류 코드', 6, 'Y'),
('USER_TYPE', '사용자 타입', '사용자 유형 분류 코드', 7, 'Y'),
('CHAT_TYPE', '채팅 타입', '채팅 유형 분류 코드', 8, 'Y')
ON CONFLICT (group_id) DO NOTHING;

-- ========================================
-- 2. 코드 상세 삽입 - 문의 상태 (TICKET_STATUS)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, attr1, use_yn) VALUES
('TICKET_STATUS', 'PENDING', '대기중', 'Pending', 1, '#FFA726', 'Y'),
('TICKET_STATUS', 'IN_PROGRESS', '처리중', 'In Progress', 2, '#42A5F5', 'Y'),
('TICKET_STATUS', 'COMPLETED', '완료', 'Completed', 3, '#66BB6A', 'Y'),
('TICKET_STATUS', 'CANCELLED', '취소', 'Cancelled', 4, '#EF5350', 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 3. 코드 상세 삽입 - 문의 우선순위 (TICKET_PRIORITY)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, attr1, use_yn) VALUES
('TICKET_PRIORITY', 'LOW', '낮음', 'Low', 1, '#9E9E9E', 'Y'),
('TICKET_PRIORITY', 'NORMAL', '보통', 'Normal', 2, '#42A5F5', 'Y'),
('TICKET_PRIORITY', 'HIGH', '높음', 'High', 3, '#FFA726', 'Y'),
('TICKET_PRIORITY', 'URGENT', '긴급', 'Urgent', 4, '#EF5350', 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 4. 코드 상세 삽입 - 문의 카테고리 (TICKET_CATEGORY)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('TICKET_CATEGORY', 'FUNCTION', '기능 문의', 'Function Inquiry', 1, 'Y'),
('TICKET_CATEGORY', 'BUG', '버그 신고', 'Bug Report', 2, 'Y'),
('TICKET_CATEGORY', 'IMPROVEMENT', '개선 제안', 'Improvement Suggestion', 3, 'Y'),
('TICKET_CATEGORY', 'ETC', '기타', 'Etc', 4, 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 5. 코드 상세 삽입 - 도움말 카테고리 (HELP_CATEGORY)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('HELP_CATEGORY', 'account', '계정관리', 'Account', 1, 'Y'),
('HELP_CATEGORY', 'usage', '이용방법', 'Usage', 2, 'Y'),
('HELP_CATEGORY', 'payment', '결제방법', 'Payment', 3, 'Y'),
('HELP_CATEGORY', 'profile', '프로필 설정', 'Profile', 4, 'Y'),
('HELP_CATEGORY', 'notification', '알림설정', 'Notification', 5, 'Y'),
('HELP_CATEGORY', 'event', '이벤트', 'Event', 6, 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 6. 코드 상세 삽입 - 키워드 카테고리 (KEYWORD_CATEGORY)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('KEYWORD_CATEGORY', 'general', '일반', 'General', 1, 'Y'),
('KEYWORD_CATEGORY', 'finance', '금융', 'Finance', 2, 'Y'),
('KEYWORD_CATEGORY', 'aml', '자금세탁방지', 'AML', 3, 'Y'),
('KEYWORD_CATEGORY', 'compliance', '컴플라이언스', 'Compliance', 4, 'Y'),
('KEYWORD_CATEGORY', 'risk', '리스크', 'Risk', 5, 'Y'),
('KEYWORD_CATEGORY', 'customer', '고객', 'Customer', 6, 'Y'),
('KEYWORD_CATEGORY', 'transaction', '거래', 'Transaction', 7, 'Y'),
('KEYWORD_CATEGORY', 'reporting', '보고', 'Reporting', 8, 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 7. 코드 상세 삽입 - 로그인 타입 (LOGIN_TYPE)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('LOGIN_TYPE', 'password', '비밀번호 로그인', 'Password Login', 1, 'Y'),
('LOGIN_TYPE', 'kakao', '카카오 로그인', 'Kakao Login', 2, 'Y'),
('LOGIN_TYPE', 'naver', '네이버 로그인', 'Naver Login', 3, 'Y'),
('LOGIN_TYPE', 'google', '구글 로그인', 'Google Login', 4, 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 8. 코드 상세 삽입 - 사용자 타입 (USER_TYPE)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('USER_TYPE', 'free', '무료', 'Free', 1, 'Y'),
('USER_TYPE', 'pro', '프로', 'Pro', 2, 'Y'),
('USER_TYPE', 'admin', '관리자', 'Admin', 3, 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

-- ========================================
-- 9. 코드 상세 삽입 - 채팅 타입 (CHAT_TYPE)
-- ========================================
INSERT INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('CHAT_TYPE', 'general', '일반 대화', 'General Chat', 1, 'Y'),
('CHAT_TYPE', 'sql', 'SQL 쿼리', 'SQL Query', 2, 'Y'),
('CHAT_TYPE', 'data', '데이터 분석', 'Data Analysis', 3, 'Y'),
('CHAT_TYPE', 'code', '코딩 지원', 'Coding Support', 4, 'Y')
ON CONFLICT (group_id, code_id) DO NOTHING;

COMMIT;

-- ========================================
-- 10. 헬퍼 뷰 생성 (코드 조회 편의성)
-- ========================================

-- 문의 상태 조회 뷰
CREATE OR REPLACE VIEW v_ticket_status AS
SELECT
    code_id,
    code_name,
    code_name_en,
    display_order,
    attr1 as color
FROM code_detail
WHERE group_id = 'TICKET_STATUS'
  AND use_yn = 'Y'
ORDER BY display_order;

COMMENT ON VIEW v_ticket_status IS '문의 상태 코드 조회 뷰';

-- 문의 우선순위 조회 뷰
CREATE OR REPLACE VIEW v_ticket_priority AS
SELECT
    code_id,
    code_name,
    code_name_en,
    display_order,
    attr1 as color
FROM code_detail
WHERE group_id = 'TICKET_PRIORITY'
  AND use_yn = 'Y'
ORDER BY display_order;

COMMENT ON VIEW v_ticket_priority IS '문의 우선순위 코드 조회 뷰';

-- 문의 카테고리 조회 뷰
CREATE OR REPLACE VIEW v_ticket_category AS
SELECT
    code_id,
    code_name,
    code_name_en,
    display_order
FROM code_detail
WHERE group_id = 'TICKET_CATEGORY'
  AND use_yn = 'Y'
ORDER BY display_order;

COMMENT ON VIEW v_ticket_category IS '문의 카테고리 코드 조회 뷰';

-- 키워드 카테고리 조회 뷰
CREATE OR REPLACE VIEW v_keyword_category AS
SELECT
    code_id,
    code_name,
    code_name_en,
    display_order
FROM code_detail
WHERE group_id = 'KEYWORD_CATEGORY'
  AND use_yn = 'Y'
ORDER BY display_order;

COMMENT ON VIEW v_keyword_category IS '키워드 카테고리 코드 조회 뷰';

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '공통코드 초기 데이터 삽입 완료';
    RAISE NOTICE '- 코드 그룹: 8개';
    RAISE NOTICE '- 코드 상세: TICKET_STATUS(4), TICKET_PRIORITY(4), TICKET_CATEGORY(4), HELP_CATEGORY(6), KEYWORD_CATEGORY(8), LOGIN_TYPE(4), USER_TYPE(3), CHAT_TYPE(4)';
    RAISE NOTICE '- 헬퍼 뷰: v_ticket_status, v_ticket_priority, v_ticket_category, v_keyword_category';
END $$;
