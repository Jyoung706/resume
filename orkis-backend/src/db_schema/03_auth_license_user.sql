-- ========================================
-- 사용자 라이선스 테이블 (auth_license_user)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE auth_license_user (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    auth_code VARCHAR(10) NOT NULL,
    license_code VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    license_state CHAR(1) DEFAULT 'Y',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
    CONSTRAINT fk_auth_license_user_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT fk_auth_license_user_auth_code
        FOREIGN KEY (auth_code) REFERENCES auth_main(auth_code),

    -- 체크 제약조건
    CONSTRAINT chk_auth_license_user_state
        CHECK (license_state IN ('Y', 'N')),

    -- 유니크 제약조건
    CONSTRAINT uk_auth_license_user_active
        UNIQUE (user_id, auth_code, license_code)
);

-- 인덱스 생성
CREATE INDEX idx_auth_license_user_user_id ON auth_license_user(user_id);
CREATE INDEX idx_auth_license_user_auth_code ON auth_license_user(auth_code);
CREATE INDEX idx_auth_license_user_license_code ON auth_license_user(license_code);
CREATE INDEX idx_auth_license_user_dates ON auth_license_user(start_date, end_date);
CREATE INDEX idx_auth_license_user_state ON auth_license_user(license_state);
CREATE INDEX idx_auth_license_user_active_search ON auth_license_user(user_id, license_state, start_date, end_date);

-- 코멘트 추가
COMMENT ON TABLE auth_license_user IS '사용자 라이선스 관리 테이블';
COMMENT ON COLUMN auth_license_user.id IS 'ID (Primary Key)';
COMMENT ON COLUMN auth_license_user.user_id IS '사용자 ID (Foreign Key)';
COMMENT ON COLUMN auth_license_user.auth_code IS '권한 코드 (Foreign Key)';
COMMENT ON COLUMN auth_license_user.license_code IS '라이선스 코드';
COMMENT ON COLUMN auth_license_user.start_date IS '라이선스 시작일';
COMMENT ON COLUMN auth_license_user.end_date IS '라이선스 종료일';
COMMENT ON COLUMN auth_license_user.license_state IS '라이선스 상태 (Y: 활성, N: 비활성)';
COMMENT ON COLUMN auth_license_user.created_at IS '생성 일시';
COMMENT ON COLUMN auth_license_user.updated_at IS '수정 일시';
