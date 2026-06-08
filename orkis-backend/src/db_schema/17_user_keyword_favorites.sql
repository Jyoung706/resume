-- ========================================
-- 사용자 키워드 즐겨찾기 테이블 (user_keyword_favorites)
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

CREATE TABLE user_keyword_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    keyword_id UUID NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약
    CONSTRAINT fk_user_keyword_favorites_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_keyword_favorites_keyword_id
        FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,

    -- 유니크 제약: 같은 사용자가 같은 키워드를 중복 등록 불가
    CONSTRAINT uk_user_keyword_favorites
        UNIQUE (user_id, keyword_id)
);

-- 인덱스 생성
CREATE INDEX idx_user_keyword_favorites_user_id ON user_keyword_favorites(user_id);
CREATE INDEX idx_user_keyword_favorites_keyword_id ON user_keyword_favorites(keyword_id);
CREATE INDEX idx_user_keyword_favorites_is_favorite ON user_keyword_favorites(user_id, is_favorite)
    WHERE is_favorite = true;
CREATE INDEX idx_user_keyword_favorites_usage ON user_keyword_favorites(user_id, usage_count DESC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_user_keyword_favorites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_keyword_favorites_update
    BEFORE UPDATE ON user_keyword_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_user_keyword_favorites_timestamp();

-- 트리거: 사용 횟수 증가 시 last_used_at 자동 갱신
CREATE OR REPLACE FUNCTION update_user_keyword_favorites_last_used()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.usage_count > OLD.usage_count THEN
        NEW.last_used_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_keyword_favorites_last_used
    BEFORE UPDATE ON user_keyword_favorites
    FOR EACH ROW
    WHEN (NEW.usage_count > OLD.usage_count)
    EXECUTE FUNCTION update_user_keyword_favorites_last_used();

-- 코멘트 추가
COMMENT ON TABLE user_keyword_favorites IS '사용자별 키워드 즐겨찾기 관리 테이블';
COMMENT ON COLUMN user_keyword_favorites.id IS '고유 ID (UUID)';
COMMENT ON COLUMN user_keyword_favorites.user_id IS '사용자 ID (Foreign Key)';
COMMENT ON COLUMN user_keyword_favorites.keyword_id IS '키워드 ID (Foreign Key)';
COMMENT ON COLUMN user_keyword_favorites.is_favorite IS '즐겨찾기 여부';
COMMENT ON COLUMN user_keyword_favorites.usage_count IS '사용 횟수';
COMMENT ON COLUMN user_keyword_favorites.last_used_at IS '마지막 사용 시각';
COMMENT ON COLUMN user_keyword_favorites.created_at IS '생성 일시';
COMMENT ON COLUMN user_keyword_favorites.updated_at IS '수정 일시';
