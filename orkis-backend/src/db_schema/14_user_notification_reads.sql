-- ========================================
-- 사용자별 알림 읽음 상태 테이블 (user_notification_reads)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE user_notification_reads (
    read_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    notice_id UUID NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 유니크 제약조건 (사용자당 공지사항 1개만 읽음 기록)
    CONSTRAINT uk_user_notice
        UNIQUE (user_id, notice_id),

    -- 외래키 제약조건
    CONSTRAINT fk_user_notification_notice_id
        FOREIGN KEY (notice_id) REFERENCES notices(notice_id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_user_notification_reads_user_id ON user_notification_reads(user_id);
CREATE INDEX idx_user_notification_reads_notice_id ON user_notification_reads(notice_id);
CREATE INDEX idx_user_notification_reads_read_at ON user_notification_reads(read_at DESC);

-- 코멘트 추가
COMMENT ON TABLE user_notification_reads IS '사용자별 공지사항 읽음 상태';
COMMENT ON COLUMN user_notification_reads.read_id IS '읽음 기록 고유 ID (UUID)';
COMMENT ON COLUMN user_notification_reads.user_id IS '사용자 ID';
COMMENT ON COLUMN user_notification_reads.notice_id IS '공지사항 ID (Foreign Key)';
COMMENT ON COLUMN user_notification_reads.read_at IS '읽음 처리 일시';
