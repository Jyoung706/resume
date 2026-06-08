// ============================================
// KeywordsPanel — 검색/분석용 키워드 관리
// Design Layer: props 기반 (로직 없음)
// ============================================
// 헤더 + 검색 + 정보 + 선택된 키워드 + 전체 키워드
// ============================================

import {
  FlexBox,
  Icon,
  Typography,
  IconButton,
  CircularProgress
} from "@/components";
import { SearchInput } from "@/components";
import { KeywordSection, type KeywordData } from "./KeywordSection";
import "./KeywordsPanel.scss";
import "../panels.scss";

// ============================================
// Props
// ============================================

export interface KeywordsPanelProps {
  /** 전체 키워드 목록 */
  keywords: KeywordData[];
  /** 선택된 키워드 목록 */
  selectedKeywords: KeywordData[];
  /** 검색어 */
  searchTerm: string;
  /** 지식베이스 이름 */
  knowledgeBase?: string;
  /** 로딩 상태 */
  loading?: boolean;
  /** 검색어 변경 핸들러 */
  onSearch: (term: string) => void;
  /** Enter Quick Add — 검색어를 임시 키워드로 추가 */
  onQuickAddKeyword?: (text: string) => void;
  /** 키워드 선택/해제 핸들러 */
  onToggleKeyword: (id: string) => void;
  /** 즐겨찾기 토글 핸들러 */
  onToggleFavorite: (id: string) => void;
  /** 키워드 삭제 핸들러 (선택 해제) */
  onRemoveKeyword: (id: string) => void;
  /** 키워드 추가 다이얼로그 열기 */
  onAddKeyword?: () => void;
}

// ============================================
// KeywordsPanel
// ============================================

export function KeywordsPanel({
  keywords,
  selectedKeywords,
  searchTerm,
  knowledgeBase,
  loading,
  onSearch,
  onQuickAddKeyword,
  onToggleKeyword,
  onToggleFavorite,
  onRemoveKeyword,
  onAddKeyword
}: KeywordsPanelProps) {
  const selectedIds = new Set(selectedKeywords.map((k) => k.id));

  return (
    <FlexBox
      direction="column"
      className="ChatPage__keywords-panel KeywordsPanel Panel__container"
    >
      {/* 헤더: 타이틀 + 추가 버튼 */}
      <FlexBox
        justify="space-between"
        align="flex-start"
        className="KeywordsPanel__header"
      >
        <Typography className="KeywordsPanel__title">키워드 힌트</Typography>
        {onAddKeyword && (
          <IconButton
            className="KeywordsPanel__add-btn"
            onClick={onAddKeyword}
          >
            <Icon mui className="KeywordsPanel__add-icon">AddIcon</Icon>
          </IconButton>
        )}
      </FlexBox>

      {/* 검색 필드 */}
      <SearchInput
        className="Panel__search-bar"
        placeholder="키워드 검색 또는 추가 (Enter)"
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        onSearch={onQuickAddKeyword}
      />

      {/* 로딩 */}
      {loading && (
        <FlexBox className="Panel__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      )}

      {!loading && (
        <FlexBox direction="column" className="KeywordsPanel__content">
          {/* 정보 카드 */}
          <FlexBox direction="column" className="KeywordsPanel__info">
            {knowledgeBase && (
              <FlexBox align="center" className="KeywordsPanel__info-row">
                <Typography className="KeywordsPanel__info-label">
                  지식베이스
                </Typography>
                <Typography className="KeywordsPanel__info-value">
                  {knowledgeBase}
                </Typography>
              </FlexBox>
            )}
            <FlexBox align="center" className="KeywordsPanel__info-row">
              <Typography className="KeywordsPanel__info-label">
                선택된 키워드 수
              </Typography>
              <Typography className="KeywordsPanel__info-value">
                {selectedKeywords.length}
              </Typography>
            </FlexBox>
          </FlexBox>

          {/* 선택된 키워드 섹션 */}
          <KeywordSection
            title="선택된 키워드"
            keywords={selectedKeywords}
            deletable
            onToggleFavorite={onToggleFavorite}
            onRemoveKeyword={onRemoveKeyword}
          />

          {/* 전체 키워드 섹션 */}
          <KeywordSection
            title="키워드"
            keywords={keywords}
            selectedIds={selectedIds}
            onToggleKeyword={onToggleKeyword}
            onToggleFavorite={onToggleFavorite}
          />
        </FlexBox>
      )}
    </FlexBox>
  );
}
