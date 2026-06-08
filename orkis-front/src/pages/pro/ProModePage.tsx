// ============================================
// ProModePage - Pro Mode v2
// Connector가 주입한 children을 ProModeShell로 래핑
// ============================================

import { type ReactNode } from "react";
import { Box } from "@/components";
import "./ProModePage.scss";

export interface ProModePageProps {
  children?: ReactNode;
}

export function ProModePage({ children }: ProModePageProps) {
  return <Box className="ProModePage">{children}</Box>;
}
