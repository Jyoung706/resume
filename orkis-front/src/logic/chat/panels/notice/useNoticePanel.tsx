/**
 * useNoticePanel — 공지사항 패널 비즈니스 로직 훅
 *
 * 책임:
 * - 공지사항 API 로드 (활성 공지만)
 * - 아코디언 단일 펼침
 * - 펼칠 때 읽음 처리 (낙관적 UI)
 * - API Notice → Design NoticeData 매핑 (HTML → ReactNode 변환)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import DOMPurify from "dompurify";
import parse, {
  domToReact,
  type HTMLReactParserOptions,
  Element,
} from "html-react-parser";
import { useNoticeStore, type Notice } from "@/logic/common/notice";
import type { NoticeData } from "@/pages/chat/panels/notice/NoticeItem";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useNoticePanel");

// --- HTML → ReactNode 변환 ---

const parserOptions: HTMLReactParserOptions = {
  replace(domNode) {
    if (domNode instanceof Element && domNode.name === "a") {
      const { href, ...rest } = domNode.attribs;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
          {domToReact(domNode.children as Parameters<typeof domToReact>[0], parserOptions)}
        </a>
      );
    }
  },
};

function toSafeReactNode(html: string): ReactNode {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "a", "ul", "ol", "li", "span"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
  return parse(sanitized, parserOptions);
}

// --- 날짜 포맷 ---

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  } catch {
    return isoString;
  }
}

// --- API → Design 매핑 ---

function toNoticeData(notice: Notice): NoticeData {
  return {
    id: notice.notice_id,
    type: notice.type,
    title: notice.title,
    content: toSafeReactNode(notice.content),
    authorName: notice.author_name,
    createdAt: formatDate(notice.created_at),
    isRead: notice.is_read ?? false,
  };
}

// --- Hook ---

export function useNoticePanel() {
  const { notices: apiNotices, isLoading, loadNotices, markAsRead } =
    useNoticeStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    loadNotices({ is_active: true });
  }, [loadNotices]);

  // 펼치기/접기 + 읽음 처리
  const onToggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => {
        const next = prev === id ? null : id;

        // 펼칠 때 읽지 않은 항목이면 읽음 처리
        if (next) {
          const notice = apiNotices.find((n) => n.notice_id === next);
          if (notice && !notice.is_read) {
            markAsRead(next).catch((err) => {
              logger.error("읽음 처리 실패:", err);
            });
          }
        }

        return next;
      });
    },
    [apiNotices, markAsRead]
  );

  // Design 매핑
  const notices: NoticeData[] = useMemo(
    () => apiNotices.map(toNoticeData),
    [apiNotices]
  );

  return {
    notices,
    expandedId,
    loading: isLoading,
    onToggleExpand,
  };
}
