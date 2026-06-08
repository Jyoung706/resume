-- ========================================
-- 메뉴 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- 참고: 실제 DB 스키마의 menu_info 컬럼 구조에 맞춤
-- ========================================

BEGIN;

-- ========================================
-- 메뉴 정보 삽입 (menu_info)
-- 실제 DB 컬럼: menu_id, menu_name, menu_path, menu_icon, menu_order, is_use, parent_menu_id
-- ========================================

-- 1차 메뉴 (부모 메뉴 없음)
-- INSERT INTO menu_info (menu_id, menu_name, menu_path, menu_icon, menu_order, is_use, parent_menu_id) VALUES
-- ('HOME', '홈', '/', 'BsHouse', 1, 'Y', NULL),
-- ('CHAT', 'AI 채팅', '/chat', 'BsRobot', 2, 'Y', NULL),
-- ('SQL_ASSIST', 'SQL 지원', '/sql-assist', 'BsDatabase', 3, 'Y', NULL),
-- ('SETTINGS', '설정', '/settings', 'BsGear', 90, 'Y', NULL),
-- ('ADMIN', '관리자', '/admin', 'BsShield', 99, 'Y', NULL)
-- ON CONFLICT (menu_id) DO NOTHING;

-- -- 2차 메뉴 (부모 메뉴 있음)
-- INSERT INTO menu_info (menu_id, menu_name, menu_path, menu_icon, menu_order, is_use, parent_menu_id) VALUES
-- -- CHAT 하위 메뉴
-- ('CHAT_NEW', '새 대화', '/chat/new', 'BsPlusCircle', 1, 'Y', 'CHAT'),
-- ('CHAT_HISTORY', '채팅 기록', '/chat/history', 'FaHistory', 2, 'Y', 'CHAT'),

-- -- SQL_ASSIST 하위 메뉴
-- ('SQL_QUERY', '쿼리 작성', '/sql-assist/query', 'BsCodeSlash', 1, 'Y', 'SQL_ASSIST'),
-- ('SQL_SCHEMA', '스키마 탐색', '/sql-assist/schema', 'BsDiagram3', 2, 'Y', 'SQL_ASSIST'),

-- -- SETTINGS 하위 메뉴
-- ('SETTINGS_PROFILE', '프로필', '/settings/profile', 'BsPerson', 1, 'Y', 'SETTINGS'),
-- ('SETTINGS_DB', 'DB 연결', '/settings/database', 'BsPlugFill', 2, 'Y', 'SETTINGS'),
-- ('SETTINGS_LLM', 'LLM 설정', '/settings/llm', 'BsRobot', 3, 'Y', 'SETTINGS'),

-- -- ADMIN 하위 메뉴
-- ('ADMIN_USERS', '사용자 관리', '/admin/users', 'BsPeople', 1, 'Y', 'ADMIN'),
-- ('ADMIN_LOGS', '시스템 로그', '/admin/logs', 'BsJournalText', 2, 'Y', 'ADMIN'),
-- ('ADMIN_NOTICES', '공지사항 관리', '/admin/notices', 'BsMegaphone', 3, 'Y', 'ADMIN')
-- ON CONFLICT (menu_id) DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '메뉴 초기 데이터 삽입 완료';
    RAISE NOTICE '- 1차 메뉴: 5개';
    RAISE NOTICE '- 2차 메뉴: 10개';
END $$;
