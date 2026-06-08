-- ========================================
-- server_health 초기 시드 데이터
-- 최종 수정: 2026-05-22
-- 참고 문서:
--   docs/2026-05-19/healthCheck/health-check-plan.md (rev7, ## 개발용 시드 데이터)
--   docs/2026-05-19/healthCheck/health-check-panel-decisions.md (2026-05-22, D1 = 변형 A')
-- 의미:
--   - jobs 가 아직 비범위라 server_health 를 실측해 갱신하는 주체가 없다.
--   - 본 시드는 "jobs 가 healthy 측정을 마쳤다는 가정" 의 픽스처.
--   - RagRegistryReader 는 본 작업 단계에서 stale 판정을 1줄 주석 처리하여 항상 stale=false.
--     jobs 도입 시 RagRegistryReader 의 stale 계산을 활성화하면 last_updated_at 기준으로 정상 동작.
--   - ON CONFLICT DO NOTHING 으로 멱등 — 마이그레이션 재실행 시 덮어쓰지 않음.
-- ========================================

BEGIN;

INSERT INTO server_health
    (service_type, preprocessing, ai_server_status, last_updated_at)
VALUES
    ('rag', 'done', TRUE, CURRENT_TIMESTAMP),
    ('llm',  NULL,  TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (service_type) DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
DECLARE
    rag_count INTEGER;
    llm_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rag_count FROM server_health WHERE service_type = 'rag';
    SELECT COUNT(*) INTO llm_count FROM server_health WHERE service_type = 'llm';
    RAISE NOTICE 'server_health 시드 적용 완료';
    RAISE NOTICE '- service_type=rag row: %', rag_count;
    RAISE NOTICE '- service_type=llm row: %', llm_count;
END $$;
