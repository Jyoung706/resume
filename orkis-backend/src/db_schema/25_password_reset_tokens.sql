-- ========================================
-- 비밀번호 재설정 토큰 테이블 (password_reset_tokens)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used_at ON password_reset_tokens(used_at);
CREATE INDEX idx_password_reset_tokens_user_unused ON password_reset_tokens(user_id, used_at)
    WHERE used_at IS NULL;
CREATE INDEX idx_password_reset_tokens_ip ON password_reset_tokens(ip_address, created_at);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_password_reset_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_password_reset_tokens_update
    BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_password_reset_tokens_timestamp();

-- 코멘트 추가
COMMENT ON TABLE password_reset_tokens IS '비밀번호 재설정 토큰 테이블';
COMMENT ON COLUMN password_reset_tokens.id IS '고유 ID (UUID)';
COMMENT ON COLUMN password_reset_tokens.user_id IS '사용자 ID (user_info.id 참조)';
COMMENT ON COLUMN password_reset_tokens.token IS '비밀번호 재설정 토큰 (UUID v4 형식)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS '토큰 만료 시각 (발급 시점 + 1시간)';
COMMENT ON COLUMN password_reset_tokens.used_at IS '토큰 사용 시각 (NULL이면 미사용)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS '비밀번호 재설정 요청 IP 주소';
COMMENT ON COLUMN password_reset_tokens.user_agent IS '비밀번호 재설정 요청 User-Agent';
COMMENT ON COLUMN password_reset_tokens.created_at IS '토큰 생성 시각';
COMMENT ON COLUMN password_reset_tokens.updated_at IS '토큰 수정 시각';
