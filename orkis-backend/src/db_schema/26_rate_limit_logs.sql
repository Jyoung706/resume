-- ========================================
-- 요청 제한 로그 테이블 (rate_limit_logs)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 유니크 제약조건
    CONSTRAINT unique_rate_limit_entry
        UNIQUE (request_type, identifier, created_at)
);

-- 인덱스 생성
CREATE INDEX idx_rate_limit_logs_type_identifier ON rate_limit_logs(request_type, identifier, created_at DESC);
CREATE INDEX idx_rate_limit_logs_ip ON rate_limit_logs(ip_address, created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE rate_limit_logs IS 'Rate Limiting 로그 (이메일 발송 빈도 제한)';
COMMENT ON COLUMN rate_limit_logs.id IS '고유 ID (UUID)';
COMMENT ON COLUMN rate_limit_logs.request_type IS '요청 타입 (email_verification, password_reset)';
COMMENT ON COLUMN rate_limit_logs.identifier IS '식별자 (이메일 또는 IP 주소)';
COMMENT ON COLUMN rate_limit_logs.ip_address IS 'IP 주소';
COMMENT ON COLUMN rate_limit_logs.user_agent IS 'User Agent';
COMMENT ON COLUMN rate_limit_logs.created_at IS '생성 일시';
