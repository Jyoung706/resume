-- ========================================
-- 서버 헬스 상태 테이블 (server_health)
-- 최종 수정: 2026-05-22
-- 참고 문서:
--   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 데이터 모델)
--   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22)
-- 운영 약속:
--   - service_type 별 1 row (PK). 'rag' / 'llm' 두 도메인.
--   - backend 는 SELECT only. 본 작업 단계에서는 jobs 가 부재하므로
--     32_initial_data_server_health.sql 의 healthy 시드가 유일한 적재처.
--   - jobs 도입 시 jobs cron 이 ai_server_status / last_updated_at / preprocessing 을 UPDATE.
--   - last_updated_at (jobs 명시 set) 과 updated_at (DB trigger) 은 의도적으로 분리.
-- ========================================

CREATE TABLE server_health (
    service_type     VARCHAR(20)              NOT NULL,
    preprocessing    VARCHAR(20)              NULL,
    ai_server_status BOOLEAN                  NULL,
    last_updated_at  TIMESTAMP WITH TIME ZONE NULL,
    last_error       TEXT                     NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_server_health PRIMARY KEY (service_type),
    CONSTRAINT chk_server_health_service_type
        CHECK (service_type IN ('rag', 'llm')),
    CONSTRAINT chk_server_health_preprocessing
        CHECK (preprocessing IS NULL
               OR preprocessing IN ('idle', 'in_progress', 'done'))
);

-- 인덱스
-- PK 가 service_type 단일 컬럼이라 별도 인덱스 불필요.
-- last_updated_at 기반 stale 조회는 row 2건이라 인덱스 무의미.

-- 업데이트 트리거 (row 변경 시 updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_server_health_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_server_health_update
    BEFORE UPDATE ON server_health
    FOR EACH ROW
    EXECUTE FUNCTION update_server_health_timestamp();

-- 코멘트
COMMENT ON TABLE server_health IS '서버 헬스 상태 (rag / llm 도메인 registry). jobs 가 UPDATE, backend 는 SELECT only.';
COMMENT ON COLUMN server_health.service_type IS '서비스 타입 (rag, llm) — PK';
COMMENT ON COLUMN server_health.preprocessing IS 'RAG 전처리 상태 (idle / in_progress / done). LLM 행에서는 NULL.';
COMMENT ON COLUMN server_health.ai_server_status IS 'AI 서버 생존 여부 (registry). RAG/LLM 의 aiServerStatus 양쪽이 참조.';
COMMENT ON COLUMN server_health.last_updated_at IS 'jobs 가 헬스를 실측한 시각. backend 의 stale 판정 기준.';
COMMENT ON COLUMN server_health.last_error IS '실패 시 진단용 메시지 (선택)';
COMMENT ON COLUMN server_health.created_at IS 'row 생성 시각 (DB 자동)';
COMMENT ON COLUMN server_health.updated_at IS 'row 변경 시각 (trigger 자동). last_updated_at 과 의도적 분리.';
