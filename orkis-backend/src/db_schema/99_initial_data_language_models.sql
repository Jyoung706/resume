-- ========================================
-- 언어 모델 초기 데이터 삽입 스크립트 (레거시 테이블)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- 참고: language_models 테이블은 레거시 테이블로, 새로운 LLM 관련 기능은
--       llm_provider, llm_available_models, llm_user_models 테이블을 사용합니다.
-- ========================================

BEGIN;

-- ========================================
-- 언어 모델 데이터 삽입 (language_models)
-- 실제 DB 컬럼: id(SERIAL), name, provider, description, max_tokens, temperature, is_active
-- ========================================

INSERT INTO language_models (model_name, provider, description, max_tokens, temperature, is_active) VALUES
-- OpenAI 모델
('GPT-4o', 'OpenAI', '최신 GPT-4 멀티모달 모델 (텍스트, 비전, 오디오)', 128000, 0.7, true),
('GPT-4o Mini', 'OpenAI', 'GPT-4o의 경량화 버전', 128000, 0.7, true),
('GPT-4', 'OpenAI', '고성능 대규모 언어 모델', 8192, 0.7, true),
('GPT-3.5 Turbo', 'OpenAI', '빠르고 효율적인 대화형 AI 모델', 16385, 0.7, true),

-- Anthropic 모델
('Claude 3.5 Sonnet', 'Anthropic', 'Anthropic의 최신 고성능 모델', 200000, 0.7, true),
('Claude 3 Opus', 'Anthropic', 'Anthropic의 가장 강력한 모델', 200000, 0.7, true),
('Claude 3 Haiku', 'Anthropic', 'Anthropic의 빠른 응답 모델', 200000, 0.7, true),

-- Google 모델
('Gemini 1.5 Pro', 'Google', 'Google의 멀티모달 AI 모델', 2000000, 0.7, true),
('Gemini 1.5 Flash', 'Google', 'Gemini 1.5의 빠른 버전', 1000000, 0.7, true),

-- ORKIS 커스텀
('ORKIS SQL', 'ORKIS', 'SQL 쿼리 생성에 최적화된 커스텀 모델', 16384, 0.3, true)

ON CONFLICT DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '언어 모델 초기 데이터 삽입 완료 (레거시 테이블)';
    RAISE NOTICE '- OpenAI: 4개';
    RAISE NOTICE '- Anthropic: 3개';
    RAISE NOTICE '- Google: 2개';
    RAISE NOTICE '- ORKIS: 1개';
    RAISE NOTICE '';
    RAISE NOTICE '참고: 새로운 LLM 기능은 llm_provider, llm_available_models, llm_user_models 테이블을 사용합니다.';
END $$;
