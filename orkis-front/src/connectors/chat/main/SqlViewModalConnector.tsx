import { useState } from "react";
import { useThemeModeContext } from "@/design-system";
import { useSqlViewStore } from "@/logic/common/chat/stores/sqlViewStore";
import { copyToClipboard } from "@/logic/common/chat/utils/clipboard";
import { formatSql } from "@/logic/common/chat/utils/sqlFormatter";
import { SqlViewModal } from "@/components/domain/SqlViewModal";

export function SqlViewModalConnector() {
  const { isOpen, sqlQuery, title, closeSqlView } = useSqlViewStore();
  const [copied, setCopied] = useState(false);
  const { resolvedMode } = useThemeModeContext();
  const isDark = resolvedMode === "dark";

  const formattedSql = formatSql(sqlQuery);

  const handleCopy = async () => {
    const success = await copyToClipboard(formattedSql);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <SqlViewModal
      open={isOpen}
      onClose={closeSqlView}
      sqlQuery={formattedSql}
      title={title}
      isDark={isDark}
      onCopy={handleCopy}
      copied={copied}
    />
  );
}
