// ============================================
// base/MarkdownRenderer — react-markdown + Visual Convenience Props
// ============================================
// react-markdown을 base 래핑하여 프로젝트 전체에서 재사용
// - GFM 확장 (테이블, 취소선, 체크리스트 등)
// - 보안: rehype-raw 미사용 (raw HTML 비활성화)
// - 스트리밍 커서: streaming prop으로 CSS ::after 제어
// ============================================

import { forwardRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import MuiBox, { type BoxProps as MuiBoxProps } from "@mui/material/Box";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
} from "../types";
import "./MarkdownRenderer.scss";

export interface MarkdownRendererProps extends VisualConvenienceProps {
  /** 마크다운 문자열 */
  children: string;
  /** 추가 className */
  className?: string;
  /** MUI sx prop */
  sx?: MuiBoxProps["sx"];
  /** 스트리밍 중 여부 — 커서 표시 제어 */
  streaming?: boolean;
}

export const MarkdownRenderer = forwardRef<HTMLDivElement, MarkdownRendererProps>(
  function MarkdownRenderer(props, ref) {
    const [convProps, { sx, className, children, streaming }] =
      splitVisualConvenienceProps(props as unknown as Record<string, unknown>) as [
        VisualConvenienceProps,
        { sx?: MuiBoxProps["sx"]; className?: string; children: string; streaming?: boolean },
      ];
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx);

    return (
      <MuiBox
        ref={ref}
        className={clsx(
          "MarkdownRenderer__base",
          "ok-markdown-renderer",
          streaming && "MarkdownRenderer__base--streaming",
          className,
        )}
        sx={mergedSx}
      >
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            // ── 코드 블록 vs 인라인 코드 구분 ──
            // react-markdown v9+에서 inline prop 제거됨
            // → pre 오버라이드로 fenced code block 래핑
            pre({ children }) {
              return (
                <div className="MarkdownRenderer__code-block">{children}</div>
              );
            },
            code({ className, children, ...codeProps }) {
              return (
                <code className={className} {...codeProps}>
                  {children}
                </code>
              );
            },
            a({ href, children }) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
          }}
        >
          {children}
        </Markdown>
      </MuiBox>
    );
  },
);
