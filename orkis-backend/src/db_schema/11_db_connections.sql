-- ========================================
-- DB 연결 정보 테이블 (db_connections)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE db_connections (
    connection_id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    db_type_id INTEGER NOT NULL,
    connection_name VARCHAR(100) NOT NULL,
    description TEXT,
    host VARCHAR(255),
    port INTEGER,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100),
    password_encrypted BYTEA,
    file_path VARCHAR(500),
    oracle_sid VARCHAR(100),
    oracle_service_name VARCHAR(100),
    additional_params JSONB,
    min_pool_size INTEGER DEFAULT 1,
    max_pool_size INTEGER DEFAULT 10,
    connection_timeout INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    last_tested TIMESTAMP WITH TIME ZONE,
    last_test_status VARCHAR(20),
    last_test_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,

    -- 외래키 제약조건
    CONSTRAINT fk_db_connections_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT fk_db_connections_db_type_id
        FOREIGN KEY (db_type_id) REFERENCES db_types(db_type_id),

    -- 유니크 제약조건
    CONSTRAINT unique_user_connection_name
        UNIQUE (user_id, connection_name)
);

-- 인덱스 생성
CREATE INDEX idx_db_connections_user_id ON db_connections(user_id);
CREATE INDEX idx_db_connections_db_type_id ON db_connections(db_type_id);
CREATE INDEX idx_db_connections_connection_name ON db_connections(connection_name);
CREATE INDEX idx_db_connections_is_active ON db_connections(is_active);
CREATE INDEX idx_db_connections_is_default ON db_connections(user_id, is_default);
CREATE INDEX idx_db_connections_last_used ON db_connections(last_used DESC NULLS LAST);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_db_connections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_db_connections_update
    BEFORE UPDATE ON db_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_db_connections_timestamp();

-- 기본 연결 하나만 보장하는 트리거
CREATE OR REPLACE FUNCTION ensure_single_default_connection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE db_connections
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND connection_id != NEW.connection_id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_default
    BEFORE INSERT OR UPDATE ON db_connections
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_connection();

-- 코멘트 추가
COMMENT ON TABLE db_connections IS '사용자별 데이터베이스 연결 정보 테이블';
COMMENT ON COLUMN db_connections.connection_id IS '연결 ID (Primary Key)';
COMMENT ON COLUMN db_connections.user_id IS '사용자 ID (Foreign Key)';
COMMENT ON COLUMN db_connections.db_type_id IS 'DB 타입 ID (Foreign Key)';
COMMENT ON COLUMN db_connections.connection_name IS '연결 별칭 (사용자 지정)';
COMMENT ON COLUMN db_connections.description IS '연결 설명';
COMMENT ON COLUMN db_connections.host IS '호스트 주소';
COMMENT ON COLUMN db_connections.port IS '포트 번호';
COMMENT ON COLUMN db_connections.database_name IS '데이터베이스 이름';
COMMENT ON COLUMN db_connections.username IS '접속 사용자명';
COMMENT ON COLUMN db_connections.password_encrypted IS '암호화된 비밀번호';
COMMENT ON COLUMN db_connections.file_path IS 'SQLite 파일 경로';
COMMENT ON COLUMN db_connections.oracle_sid IS 'Oracle SID';
COMMENT ON COLUMN db_connections.oracle_service_name IS 'Oracle Service Name';
COMMENT ON COLUMN db_connections.additional_params IS '추가 연결 옵션 (JSON)';
COMMENT ON COLUMN db_connections.min_pool_size IS '최소 연결 풀 크기';
COMMENT ON COLUMN db_connections.max_pool_size IS '최대 연결 풀 크기';
COMMENT ON COLUMN db_connections.connection_timeout IS '연결 타임아웃 (초)';
COMMENT ON COLUMN db_connections.is_active IS '활성화 여부';
COMMENT ON COLUMN db_connections.is_default IS '기본 연결 여부';
COMMENT ON COLUMN db_connections.last_tested IS '마지막 연결 테스트 일시';
COMMENT ON COLUMN db_connections.last_test_status IS '마지막 테스트 상태';
COMMENT ON COLUMN db_connections.last_test_message IS '마지막 테스트 메시지';
COMMENT ON COLUMN db_connections.created_at IS '생성 일시';
COMMENT ON COLUMN db_connections.updated_at IS '수정 일시';
COMMENT ON COLUMN db_connections.last_used IS '마지막 사용 일시';
