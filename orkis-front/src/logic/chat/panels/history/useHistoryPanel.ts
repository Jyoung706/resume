/**
 * useHistoryPanel — 채팅 이력 패널 비즈니스 로직 훅
 *
 * 책임:
 * - 세션별 채팅 이력 API 로드 (페이지네이션)
 * - 아코디언 단일 펼침
 * - SQL 클립보드 복사
 * - API ChatHistoryApiItem -> Design ChatHistoryItem 매핑
 * - 실시간 대화 완료 시 이력 자동 갱신
 * - 이력 탭 전환 시 데이터 최신화
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelectedChatId } from "@/logic/common/chat/stores/chatSessionStore";
import { useMessageStreamStore } from "@/logic/common/chat/stores/messageStreamStore";
import { useRightSidebarStore } from "@/logic/common/ui/rightSidebarStore";
import { chatHistoryService } from "@/logic/common/chat/services/chatHistoryService";
import type { ChatHistoryApiItem } from "@/logic/common/chat/types/chat";
import type { ChatHistoryItem } from "@/pages/chat/panels/history/HistoryItem";
import type { ProcessStepData } from "@/components/domain/ChatMessage/SqlProcessSteps";
import { showToast } from "@/logic/shared/utils/toast";
import { getLogger } from "@/logic/shared/utils/logger";
import { chatConfig } from "@/logic/shared/config/chatConfig";

const logger = getLogger("useHistoryPanel");

const { pageSize: PAGE_SIZE, refreshDelayMs: REFRESH_DELAY_MS, stepDisplayNames } = chatConfig.history;

// ── API -> Design 변환 함수 ──

/** API status -> Design ProcessStepData status 매핑 */
const statusMap: Record<string, ProcessStepData["status"]> = {
  success: "completed",
  completed: "completed",
  failed: "error",
  error: "error",
  running: "running",
  stopped: "stopped",
  pending: "pending",
};

/** API ProcessStep -> Design ProcessStepData 변환 */
const toDesignProcessStep = (
  step: { name: string; status: string; order: number },
  index: number
): ProcessStepData => ({
  id: `step-${index}`,
  label: stepDisplayNames[step.name] || step.name,
  status: statusMap[step.status] ?? "pending",
});

/** ISO string -> "YYYY.MM.DD HH:mm" 포맷 */
function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${Y}.${M}.${D} ${h}:${m}`;
}

/** API ChatHistoryItem -> Design ChatHistoryItem 변환 */
const toDesignHistoryItem = (item: ChatHistoryApiItem): ChatHistoryItem => ({
  id: item.messageId,
  question: item.question,
  answer: item.answer || undefined,
  date: formatTimestamp(item.createdAt),
  processSteps: [...(item.steps ?? [])]
    .sort((a, b) => a.order - b.order)
    .map(toDesignProcessStep),
  sql: item.sql,
  success: item.success,
});

// ── 훅 본체 ──

export function useHistoryPanel() {
  const selectedChatId = useSelectedChatId();

  // 실시간 갱신을 위한 스토어 구독
  const isSending = useMessageStreamStore((s) => s.isSending);
  const activeTab = useRightSidebarStore((s) => s.activeTab);
  const isHistoryTab = activeTab === "history";

  // 이전 상태 추적
  const prevIsSendingRef = useRef(isSending);
  const prevIsHistoryTabRef = useRef(isHistoryTab);

  // API 원본 상태
  const [apiItems, setApiItems] = useState<ChatHistoryApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const hasMore = currentPage < totalPages;

  // UI 상태
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // API -> Design 변환 (메모이제이션)
  const items: ChatHistoryItem[] = useMemo(
    () => apiItems.map(toDesignHistoryItem),
    [apiItems]
  );

  // ── 데이터 로딩 ──

  /** 첫 페이지 로드 (초기 / 새로고침 / 세션 전환) */
  const fetchHistory = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await chatHistoryService.getChatHistory(sessionId, {
        page: 1,
        limit: PAGE_SIZE,
      });
      setApiItems(response.history ?? []);
      setCurrentPage(1);
      setTotalPages(response.totalPages);
      setTotalCount(response.total);
    } catch (error) {
      logger.error("채팅 이력 로드 실패", error);
      showToast("채팅 이력을 불러오지 못했습니다.", "error");
      setApiItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 다음 페이지 추가 로드 */
  const loadMore = useCallback(async () => {
    if (!selectedChatId || !hasMore || loadingMore) return;
    const nextPage = currentPage + 1;
    try {
      setLoadingMore(true);
      const response = await chatHistoryService.getChatHistory(selectedChatId, {
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setApiItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.messageId));
        const newItems = (response.history ?? []).filter(
          (i) => !existingIds.has(i.messageId)
        );
        return [...prev, ...newItems];
      });
      setCurrentPage(nextPage);
      setTotalPages(response.totalPages);
      setTotalCount(response.total);
    } catch (error) {
      logger.error("채팅 이력 추가 로드 실패", error);
      showToast("추가 이력을 불러오지 못했습니다.", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [selectedChatId, hasMore, loadingMore, currentPage]);

  // ── 갱신 트리거 ──

  // (1) sessionId 변경 시 자동 로딩
  useEffect(() => {
    if (!selectedChatId) {
      setApiItems([]);
      setCurrentPage(1);
      setTotalPages(0);
      setTotalCount(0);
      return;
    }
    setExpandedId(null);
    fetchHistory(selectedChatId);
  }, [selectedChatId, fetchHistory]);

  // (2) 실시간 대화 완료 시 이력 자동 갱신
  useEffect(() => {
    const wasJustSending = prevIsSendingRef.current && !isSending;
    prevIsSendingRef.current = isSending;

    if (wasJustSending && isHistoryTab && selectedChatId) {
      const timer = setTimeout(() => {
        fetchHistory(selectedChatId);
      }, REFRESH_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isSending, isHistoryTab, selectedChatId, fetchHistory]);

  // (3) 이력 탭으로 전환 시 갱신
  useEffect(() => {
    const justSwitchedToHistory =
      !prevIsHistoryTabRef.current && isHistoryTab;
    prevIsHistoryTabRef.current = isHistoryTab;

    if (justSwitchedToHistory && selectedChatId) {
      fetchHistory(selectedChatId);
    }
  }, [isHistoryTab, selectedChatId, fetchHistory]);

  // ── 핸들러 ──

  const onToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const onViewSql = useCallback((sql: string) => {
    navigator.clipboard
      .writeText(sql)
      .then(() => {
        showToast("SQL이 클립보드에 복사되었습니다.", "success");
      })
      .catch(() => {
        showToast("SQL 복사에 실패했습니다.", "error");
      });
  }, []);

  return {
    items,
    expandedId,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    onToggleExpand,
    onViewSql,
    onLoadMore: loadMore,
  };
}
