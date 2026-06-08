// ============================================
// ui/Accordion — MUI Accordion 래퍼
// 패널 시스템에서 일관된 아코디언 UI 제공
// ============================================

import type { SxProps, Theme } from "@mui/material/styles";
import clsx from "clsx";
import { forwardRef } from "react";
import type { AccordionBaseProps } from "../../base/Accordion";
import {
  AccordionBase,
  AccordionDetails,
  AccordionSummary
} from "../../base/Accordion";
import { Box } from "../../base/Box";
import { ExpandMoreIcon } from "../../base/MuiIcon";
import { Typography } from "../../base/Typography";
import "./Accordion.scss";

export interface AccordionProps extends Omit<
  AccordionBaseProps,
  "onChange" | "title" | "children"
> {
  /** 아코디언 고유 ID */
  id: string;
  /** 헤더 제목 (문자열 또는 ReactNode) */
  title: React.ReactNode;
  /** 확장 상태 */
  expanded: boolean;
  /** 확장/축소 토글 핸들러 — id를 인자로 전달 */
  onChange: (id: string) => void;
  /** 아코디언 내용 */
  children: React.ReactNode;
  /** 헤더 좌측 아이콘 */
  icon?: React.ReactNode;
  /** 확장 아이콘 (기본: ExpandMoreIcon) */
  expandIcon?: React.ReactNode;
  /** AccordionSummary sx */
  summarySx?: SxProps<Theme>;
  /** AccordionDetails sx */
  detailsSx?: SxProps<Theme>;
  /** 제목 Typography sx (title이 문자열일 때만 적용) */
  titleSx?: SxProps<Theme>;
  /** 테두리/그림자 제거 (기본: true) */
  disableBorder?: boolean;
  /** 확장 시 마진 변경 비활성화 (기본: true) */
  disableExpandedMargin?: boolean;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  function Accordion(
    {
      id,
      title,
      expanded,
      onChange,
      children,
      icon,
      expandIcon,
      summarySx,
      detailsSx,
      titleSx,
      disableBorder = true,
      disableExpandedMargin = true,
      className,
      sx,
      ...muiProps
    },
    ref
  ) {
    const handleChange = (_e: React.SyntheticEvent, _isExpanded: boolean) => {
      onChange(id);
    };

    return (
      <AccordionBase
        ref={ref}
        className={clsx("Accordion__base", "ok-accordion", className)}
        expanded={expanded}
        onChange={handleChange}
        disableGutters
        elevation={0}
        sx={sx}
        // sx={[
        //   {
        //     "&:before": { display: "none" },
        //     ...(disableExpandedMargin && {
        //       "&.Mui-expanded": { margin: 0 },
        //     }),
        //     ...(disableBorder && { boxShadow: "none" }),
        //   },
        //   ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        // ]}
        {...muiProps}
      >
        <AccordionSummary
          expandIcon={expandIcon ?? <ExpandMoreIcon />}
          aria-controls={`${id}-content`}
          id={`${id}-header`}
          sx={summarySx}
          // sx={[
          //   {
          //     minHeight: "3rem",
          //     "&.Mui-expanded": { minHeight: "3rem" },
          //     "& .MuiAccordionSummary-content": {
          //       margin: "0.75rem 0",
          //       overflow: "hidden",
          //       minWidth: 0,
          //       "&.Mui-expanded": { margin: "0.75rem 0" },
          //     },
          //   },
          //   ...(Array.isArray(summarySx) ? summarySx : summarySx ? [summarySx] : []),
          // ]}
        >
          {icon && (
            <Box className="Accordion__icon ok-accordion-icon">
              {/* sx={{ display: "flex", alignItems: "center", mr: 1, flexShrink: 0 }} */}
              {icon}
            </Box>
          )}
          <Box className="Accordion__title ok-accordion-title-wrap">
            {/* sx={{ flex: 1, minWidth: 0, overflow: "hidden" }} */}
            {typeof title === "string" ? (
              <Typography
                // noWrap
                sx={titleSx}
                // sx={[
                //   ...(Array.isArray(titleSx) ? titleSx : titleSx ? [titleSx] : []),
                // ]}
              >
                {title}
              </Typography>
            ) : (
              title
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails
          sx={detailsSx}
          // sx={[
          //   { padding: "0.5rem 1rem 1rem" },
          //   ...(Array.isArray(detailsSx) ? detailsSx : detailsSx ? [detailsSx] : []),
          // ]}
        >
          {children}
        </AccordionDetails>
      </AccordionBase>
    );
  }
);
