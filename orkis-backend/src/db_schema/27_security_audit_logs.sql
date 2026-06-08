-- ========================================
-- 보안 감사 로그 테이블 (security_audit_logs)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50),
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_security_audit_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX idx_security_audit_logs_user_id ON security_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_security_audit_logs_event_type ON security_audit_logs(event_type, created_at DESC);
CREATE INDEX idx_security_audit_logs_ip ON security_audit_logs(ip_address, created_at DESC);
CREATE INDEX idx_security_audit_logs_metadata ON security_audit_logs USING GIN (metadata);

-- 코멘트 추가
COMMENT ON TABLE security_audit_logs IS '보안 감사 로그 (인증/비밀번호 관련 이벤트)';
COMMENT ON COLUMN security_audit_logs.id IS '고유 ID (UUID)';
COMMENT ON COLUMN security_audit_logs.user_id IS '사용자 ID (삭제 시 NULL)';
COMMENT ON COLUMN security_audit_logs.event_type IS '이벤트 타입 (email_verified, password_reset_requested, password_changed)';
COMMENT ON COLUMN security_audit_logs.event_description IS '이벤트 설명';
COMMENT ON COLUMN security_audit_logs.ip_address IS 'IP 주소';
COMMENT ON COLUMN security_audit_logs.user_agent IS 'User Agent';
COMMENT ON COLUMN security_audit_logs.metadata IS '추가 메타데이터 (JSON 형식)';
COMMENT ON COLUMN security_audit_logs.created_at IS '생성 일시';
