// ============================================
// KeywordsPanelConnector — 키워드 패널 커넥터
// Logic(useKeywordsPanel) ↔ Design(KeywordsPanel) 접착
// ============================================

import { useState, useEffect, useCallback } from "react";
import { useSelectedChatId } from "@/logic/common/chat/stores/chatSessionStore";
import { useKeywordsPanel } from "@/logic/chat/panels/keywords/useKeywordsPanel";
import { keywordService } from "@/logic/common/chat/services/keywordService";
import { useKeywordSelectionStore } from "@/logic/common/chat/stores/keywordSelectionStore";
import { codeService } from "@/logic/common/code/services/codeService";
import { KeywordsPanel } from "@/pages/chat/panels/keywords/KeywordsPanel";
import { KeywordCreateDialog } from "@/components/domain/KeywordCreateDialog";
import { showToast } from "@/logic/shared/utils/toast";

export function KeywordsPanelConnector() {
  const sessionId = useSelectedChatId();
  const panel = useKeywordsPanel(sessionId);
  const keywordStore = useKeywordSelectionStore();

  // ── 다이얼로그 상태 ──
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // ── 카테고리 로드 ──
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const fallback = [{ id: "general", name: "일반" }];
    const fetchCategories = async () => {
      try {
        const response = await codeService.getKeywordCategories();

        // response가 {success: true, data: Array} 형태인지 확인 (orkis-front 동일 패턴)
        const data =
          response && typeof response === "object" && "data" in response
            ? (response as Record<string, unknown>).data
            : response;

        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c) => ({ id: c.codeId, name: c.codeName })));
        } else {
          setCategories(fallback);
        }
      } catch {
        setCategories(fallback);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // ── 키워드 생성 (다이얼로그 submit) ──
  const handleCreateKeyword = useCallback(
    async (data: {
      text: string;
      category: string;
      isFavorite: boolean;
    }) => {
      try {
        setSubmitLoading(true);
        const created = await keywordService.createKeyword({
          text: data.text,
          type: "custom",
          category: data.category,
          isFavorite: data.isFavorite
        });
        // 생성 후 현재 세션에 자동 선택
        if (sessionId && created) {
          keywordStore.addKeyword(sessionId, { id: created.id, name: created.text });
        }
        setCreateDialogOpen(false);
        showToast("키워드가 등록되었습니다.");
        panel.refreshKeywords();
      } catch {
        showToast("키워드 등록에 실패했습니다.", "error");
      } finally {
        setSubmitLoading(false);
      }
    },
    [panel]
  );

  return (
    <>
      <KeywordsPanel
        keywords={panel.keywords}
        selectedKeywords={panel.selectedKeywords}
        searchTerm={panel.searchTerm}
        knowledgeBase={panel.knowledgeBase}
        loading={panel.loading}
        onSearch={panel.onSearch}
        onQuickAddKeyword={panel.onQuickAddKeyword}
        onToggleKeyword={panel.onToggleKeyword}
        onToggleFavorite={panel.onToggleFavorite}
        onRemoveKeyword={panel.onRemoveKeyword}
        onAddKeyword={() => setCreateDialogOpen(true)}
      />
      <KeywordCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateKeyword}
        categories={categories}
        categoriesLoading={categoriesLoading}
        submitLoading={submitLoading}
      />
    </>
  );
}
