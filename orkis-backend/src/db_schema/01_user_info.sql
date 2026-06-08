-- ========================================
-- 사용자 정보 테이블 (user_info)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE user_info (
    id VARCHAR(50) PRIMARY KEY,
    password VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    login_type VARCHAR(20) NOT NULL,
    user_type VARCHAR(50),
    social_id VARCHAR(100),
    social_provider VARCHAR(20),
    profile_image VARCHAR(500),
    background_image VARCHAR(500),
    question_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_user_info_email ON user_info(email);
CREATE INDEX idx_user_info_email_verified ON user_info(email_verified);
CREATE INDEX idx_user_info_login_type ON user_info(login_type);
CREATE INDEX idx_user_info_social_id ON user_info(social_id);
CREATE INDEX idx_user_info_social_provider ON user_info(social_provider);

-- 코멘트 추가
COMMENT ON TABLE user_info IS '사용자 정보 테이블';
COMMENT ON COLUMN user_info.id IS '사용자 ID (Primary Key)';
COMMENT ON COLUMN user_info.password IS '암호화된 비밀번호 (소셜 로그인 시 NULL)';
COMMENT ON COLUMN user_info.name IS '사용자 이름';
COMMENT ON COLUMN user_info.email IS '이메일 주소';
COMMENT ON COLUMN user_info.phone IS '전화번호';
COMMENT ON COLUMN user_info.login_type IS '로그인 유형 (password, kakao, naver, google). enum LoginType 기준';
COMMENT ON COLUMN user_info.user_type IS '사용자 요금제 (free, pro, admin) — auth_license_user.auth_code와 1:1 대응';
COMMENT ON COLUMN user_info.social_id IS '소셜 제공자의 사용자 ID';
COMMENT ON COLUMN user_info.social_provider IS '소셜 제공자 (naver, kakao, google)';
COMMENT ON COLUMN user_info.question_count IS '질문 가능 횟수';
COMMENT ON COLUMN user_info.created_at IS '생성 일시';
COMMENT ON COLUMN user_info.updated_at IS '수정 일시';
COMMENT ON COLUMN user_info.email_verified IS '이메일 인증 완료 여부';
COMMENT ON COLUMN user_info.email_verified_at IS '이메일 인증 완료 시각';
COMMENT ON COLUMN user_info.profile_image IS '사용자 프로필 이미지 파일 경로';
COMMENT ON COLUMN user_info.background_image IS '사용자 채팅방 이미지 파일 경로';
