-- ========================================
-- 사용자 및 권한 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

BEGIN;

-- ========================================
-- 1. 사용자 정보 삽입 (user_info)
-- ========================================
-- 기본 테스트 계정 3종: free / pro / admin
-- 비밀번호는 ID와 동일 (bcrypt saltRounds=10)
--   userFree  / userFree
--   userPro   / userPro
--   userAdmin / userAdmin
INSERT INTO user_info (
    id, password, name, email, phone, login_type, user_type,
    social_id, social_provider, question_count,
    email_verified, email_verified_at
) VALUES
-- 무료 사용자 (pw: userFree)
('userFree', '$2b$10$2zpMlaSdPMAlI4KR2XH7z.lt3WbZ1LlLNgMQAotUPHMcCADJFIp36',
 '무료 사용자', 'userfree@orkis.test', NULL,
 'password', 'free', NULL, NULL, 0, true, CURRENT_TIMESTAMP),

-- 프로 사용자 (pw: userPro)
('userPro', '$2b$10$xua0wUPzU7ls0sKQWTHIOubJb1n9mYYXlDTMcik/CG.W3v4.FBbJO',
 '프로 사용자', 'userpro@orkis.test', NULL,
 'password', 'pro', NULL, NULL, 0, true, CURRENT_TIMESTAMP),

-- 관리자 사용자 (pw: userAdmin)
('userAdmin', '$2b$10$XuYqmoYubO7e8/H6QcI8COSl93syfPni8eqbu6ulG5nCfAG7a2TH6',
 '관리자', 'useradmin@orkis.test', NULL,
 'password', 'admin', NULL, NULL, 0, true, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. 권한 메인 정보 삽입 (auth_main)
-- ========================================
INSERT INTO public.auth_main
(auth_code, auth_name, description, icon, color_start, color_end, visible, selectable, created_at, updated_at)
VALUES('1', '일반 모드', '일반사용자 권한', 'G', '#3182CE', '#2C5AA0', true, true, '2025-09-23 18:16:29.276', '2025-09-23 18:16:29.276')
ON CONFLICT (auth_code) DO NOTHING;
INSERT INTO public.auth_main
(auth_code, auth_name, description, icon, color_start, color_end, visible, selectable, created_at, updated_at)
VALUES('2', '프로 모드', '프로사용자 권한', 'P', '#805AD5', '#553C9A', true, false, '2025-09-23 18:16:29.276', '2025-09-23 18:16:29.276')
ON CONFLICT (auth_code) DO NOTHING;
INSERT INTO public.auth_main
(auth_code, auth_name, description, icon, color_start, color_end, visible, selectable, created_at, updated_at)
VALUES('3', '관리자 모드', '시스템 관리자 권한', 'A', '#E53E3E', '#C53030', false, false, '2025-09-23 18:16:29.276', '2025-09-23 18:16:29.276')
ON CONFLICT (auth_code) DO NOTHING;

-- ========================================
-- 3. 라이선스 및 권한 부여 (auth_license_user)
-- ========================================
-- user_type → auth_code 매핑: free='1', pro='2', admin='3' (AuthConstants.ts 기준)
INSERT INTO auth_license_user (
    user_id, auth_code, license_code, start_date, end_date, license_state
) VALUES
('userFree',  '1', 'LIC_USERFREE_1_DEFAULT',  '2025-01-01', '2099-12-31', 'Y'),
('userPro',   '2', 'LIC_USERPRO_2_DEFAULT',   '2025-01-01', '2099-12-31', 'Y'),
('userAdmin', '3', 'LIC_USERADMIN_3_DEFAULT', '2025-01-01', '2099-12-31', 'Y')
ON CONFLICT (user_id, auth_code, license_code) DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '사용자 및 권한 초기 데이터 삽입 완료';
    RAISE NOTICE '- 사용자: 3명 (userFree=free, userPro=pro, userAdmin=admin)';
    RAISE NOTICE '- 권한: 3개 (1=일반 모드, 2=프로 모드, 3=관리자 모드)';
    RAISE NOTICE '- 라이선스: 3개';
END $$;
