// ============================================
// HelpPanel — 자주 묻는 질문 / 도움말
// Design Layer: props 기반 (로직 없음)
// ============================================
// 검색 + 카테고리 필터 + FAQ 아코디언
// ============================================

import {
  FlexBox,
  Typography,
  Chip,
  CircularProgress
} from "@/components";
import { SearchInput, Accordion, EmptyState } from "@/components";
import "./HelpPanel.scss";
import "../panels.scss";

// ============================================
// Types
// ============================================

export interface HelpCategory {
  id: string;
  name: string;
}

export interface HelpItem {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
}

// ============================================
// Props
// ============================================

export interface HelpPanelProps {
  /** 카테고리 목록 */
  categories: HelpCategory[];
  /** FAQ 항목 목록 */
  items: HelpItem[];
  /** 선택된 카테고리 ID */
  selectedCategory: string | null;
  /** 검색어 */
  searchTerm: string;
  /** 펼쳐진 FAQ ID */
  expandedId: string | null;
  /** 로딩 상태 */
  loading?: boolean;
  /** 검색어 변경 핸들러 */
  onSearch: (term: string) => void;
  /** 카테고리 선택 핸들러 */
  onSelectCategory: (id: string | null) => void;
  /** FAQ 펼치기/접기 핸들러 */
  onToggleExpand: (id: string) => void;
}

// ============================================
// HelpPanel
// ============================================

export function HelpPanel({
  categories,
  items,
  selectedCategory,
  searchTerm,
  expandedId,
  loading,
  onSearch,
  onSelectCategory,
  onToggleExpand
}: HelpPanelProps) {
  return (
    <FlexBox
      direction="column"
      className="ChatPage__help-panel Panel__container"
    >
      {/* 검색바 */}
      <SearchInput
        className="Panel__search-bar"
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        onSearch={onSearch}
        placeholder="검색어를 입력하세요"
      />

      {/* 카테고리 칩 */}
      {categories.length > 0 && (
        <FlexBox wrap="wrap" className="HelpPanel__categories">
          <Chip
            label="전체"
            size="xsmall"
            variant="outlined"
            className={`HelpPanel__category-chip ${selectedCategory === null ? "HelpPanel__category-chip--active" : ""}`}
            onClick={() => onSelectCategory(null)}
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              size="xsmall"
              variant="outlined"
              className={`HelpPanel__category-chip ${selectedCategory === cat.id ? "HelpPanel__category-chip--active" : ""}`}
              onClick={() => onSelectCategory(cat.id)}
            />
          ))}
        </FlexBox>
      )}

      {/* 로딩 */}
      {loading && (
        <FlexBox className="Panel__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      )}

      {/* FAQ 아코디언 목록 */}
      {!loading && items.length > 0 && (
        <FlexBox direction="column" className="HelpPanel__faq-list">
          {items.map((item) => (
            <Accordion
              key={item.id}
              id={item.id}
              size="xsmall"
              title={item.question}
              expanded={expandedId === item.id}
              onChange={onToggleExpand}
            >
              <Typography className="HelpPanel__answer">
                {item.answer}
              </Typography>
            </Accordion>
          ))}
        </FlexBox>
      )}

      {/* 빈 결과 */}
      {!loading && items.length === 0 && (
        <EmptyState className="Panel__empty" title="검색 결과가 없습니다" />
      )}
    </FlexBox>
  );
}
