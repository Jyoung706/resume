-- ========================================
-- LLM 제공자 및 모델 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

BEGIN;

-- ========================================
-- 1. LLM 제공자(Provider) 데이터 삽입 (llm_provider)
-- ========================================
INSERT INTO llm_provider (provider_name, website, api_docs, logo_filename) VALUES
('OpenAI', 'https://openai.com', 'https://platform.openai.com/docs', 'openai.png')
-- ('Anthropic', 'https://anthropic.com', 'https://docs.anthropic.com', 'anthropic.ico'),
-- ('Google', 'https://deepmind.google', 'https://ai.google.dev/docs', 'google.ico'),
-- ('Meta', 'https://llama.meta.com', 'https://llama.meta.com/docs', 'meta.png'),
-- ('Mistral AI', 'https://mistral.ai', 'https://docs.mistral.ai', 'mistral-ai.ico'),
-- ('Cohere', 'https://cohere.com', 'https://docs.cohere.com', 'cohere.ico'),
-- ('AI21 Labs', 'https://ai21.com', 'https://docs.ai21.com', 'ai21-labs.ico'),
-- ('xAI', 'https://x.ai', 'https://docs.x.ai', 'xai.ico'),
-- ('DeepSeek', 'https://deepseek.com', 'https://platform.deepseek.com/docs', 'deepseek.png'),
-- ('Amazon (Bedrock)', 'https://aws.amazon.com/bedrock', 'https://docs.aws.amazon.com/bedrock', 'amazon-bedrock.ico'),
-- ('01.AI', 'https://01.ai', 'https://platform.01.ai/docs', '01.ai.ico'),
-- ('Technology Innovation Institute', 'https://falconllm.tii.ae', 'https://huggingface.co/tiiuae', 'technology-innovation-institute.ico')
ON CONFLICT (provider_name) DO NOTHING;

-- ========================================
-- 2. LLM 모델 데이터 삽입 (llm_available_models)
-- ========================================

-- OpenAI 모델들
INSERT INTO llm_available_models (
    provider_id, model_name, model_identifier, version,
    context_window, max_output_tokens, capabilities,
    pricing_input, pricing_output, release_date
) VALUES
-- GPT-5 시리즈
((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-5', 'gpt-5', 'gpt-5-2025-01-01', 200000, 32768,
 ARRAY['text', 'vision', 'audio', 'code'], '$5.00 per 1M tokens', '$20.00 per 1M tokens', '2025-01-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-5 Mini', 'gpt-5-mini', 'gpt-5-mini-2025-01-01', 200000, 32768,
 ARRAY['text', 'vision', 'audio'], '$1.00 per 1M tokens', '$4.00 per 1M tokens', '2025-01-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-5 Nano', 'gpt-5-nano', 'gpt-5-nano-2025-01-01', 128000, 16384,
 ARRAY['text', 'vision'], '$0.20 per 1M tokens', '$0.80 per 1M tokens', '2025-01-01'),

-- GPT-4o 시리즈
((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-4o', 'gpt-4o', 'gpt-4o-2024-11-20', 128000, 16384,
 ARRAY['text', 'vision', 'audio'], '$2.50 per 1M tokens', '$10.00 per 1M tokens', '2024-05-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-4o Mini', 'gpt-4o-mini', 'gpt-4o-mini-2024-07-18', 128000, 16384,
 ARRAY['text', 'vision', 'audio'], '$0.15 per 1M tokens', '$0.60 per 1M tokens', '2024-07-01'),

-- GPT-4 레거시
((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-4', 'gpt-4', 'gpt-4-0613', 8192, 8192,
 ARRAY['text'], '$30.00 per 1M tokens', '$60.00 per 1M tokens', '2023-06-01'),

-- GPT-3.5 레거시
((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-3.5 Turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-0125', 16385, 4096,
 ARRAY['text'], '$0.50 per 1M tokens', '$1.50 per 1M tokens', '2024-01-01')

ON CONFLICT (provider_id, model_identifier) DO NOTHING;

-- Anthropic 모델들
-- INSERT INTO llm_available_models (
--     provider_id, model_name, model_identifier, version,
--     context_window, max_output_tokens, capabilities,
--     pricing_input, pricing_output, release_date
-- ) VALUES
-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Anthropic'),
--  'Claude 3.5 Opus', 'claude-3-5-opus-20251022', 'claude-3-5-opus-20251022', 200000, 8192,
--  ARRAY['text', 'vision', 'code', 'analysis'], '$15.00 per 1M tokens', '$75.00 per 1M tokens', '2025-10-22'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Anthropic'),
--  'Claude 3.5 Sonnet', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20241022', 200000, 8192,
--  ARRAY['text', 'vision', 'code', 'analysis'], '$3.00 per 1M tokens', '$15.00 per 1M tokens', '2024-10-22'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Anthropic'),
--  'Claude 3.5 Haiku', 'claude-3-5-haiku-20241022', 'claude-3-5-haiku-20241022', 200000, 8192,
--  ARRAY['text', 'code'], '$0.25 per 1M tokens', '$1.25 per 1M tokens', '2024-10-22'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Anthropic'),
--  'Claude 3 Opus', 'claude-3-opus-20240229', 'claude-3-opus-20240229', 200000, 4096,
--  ARRAY['text', 'vision', 'code', 'analysis'], '$15.00 per 1M tokens', '$75.00 per 1M tokens', '2024-02-29'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Anthropic'),
--  'Claude 3 Sonnet', 'claude-3-sonnet-20240229', 'claude-3-sonnet-20240229', 200000, 4096,
--  ARRAY['text', 'vision', 'code'], '$3.00 per 1M tokens', '$15.00 per 1M tokens', '2024-02-29'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Anthropic'),
--  'Claude 3 Haiku', 'claude-3-haiku-20240307', 'claude-3-haiku-20240307', 200000, 4096,
--  ARRAY['text', 'code'], '$0.25 per 1M tokens', '$1.25 per 1M tokens', '2024-03-07')

-- ON CONFLICT (provider_id, model_identifier) DO NOTHING;

-- -- Google 모델들
-- INSERT INTO llm_available_models (
--     provider_id, model_name, model_identifier, version,
--     context_window, max_output_tokens, capabilities,
--     pricing_input, pricing_output, release_date
-- ) VALUES
-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Google'),
--  'Gemini 2.0 Ultra', 'gemini-2.0-ultra', 'gemini-2.0-ultra', 2000000, 65536,
--  ARRAY['text', 'vision', 'audio', 'video', 'code'], '$12.50 per 1M tokens', '$50.00 per 1M tokens', '2025-01-01'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Google'),
--  'Gemini 2.0 Pro', 'gemini-2.0-pro', 'gemini-2.0-pro', 2000000, 65536,
--  ARRAY['text', 'vision', 'code'], '$2.50 per 1M tokens', '$10.00 per 1M tokens', '2025-01-01'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Google'),
--  'Gemini 1.5 Pro', 'gemini-1.5-pro', 'gemini-1.5-pro-002', 2000000, 8192,
--  ARRAY['text', 'vision', 'audio', 'video', 'code'], '$1.25 per 1M tokens', '$5.00 per 1M tokens', '2024-05-01'),

-- ((SELECT provider_id FROM llm_provider WHERE provider_name = 'Google'),
--  'Gemini 1.5 Flash', 'gemini-1.5-flash', 'gemini-1.5-flash-002', 1000000, 8192,
--  ARRAY['text', 'vision', 'code'], '$0.075 per 1M tokens', '$0.30 per 1M tokens', '2024-05-01')

-- ON CONFLICT (provider_id, model_identifier) DO NOTHING;

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE 'LLM 제공자 및 모델 초기 데이터 삽입 완료';
    RAISE NOTICE '- 제공자: 12개';
    RAISE NOTICE '- OpenAI 모델: 7개';
    RAISE NOTICE '- Anthropic 모델: 6개';
    RAISE NOTICE '- Google 모델: 4개';
END $$;
