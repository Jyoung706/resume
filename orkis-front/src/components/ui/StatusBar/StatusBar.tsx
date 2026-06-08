// ============================================
// ui/StatusBar — 서버 연결 상태 표시 바
// Design Layer: props-only, 로직 없음
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import { Divider } from "../../base/Divider";
import { Img } from "../../base/Img";
import { Typography } from "../../base/Typography";
import { FlexBox } from "../../layout/FlexBox";
import "./StatusBar.scss";

// ============================================
// Types
// ============================================

export interface StatusBarItem {
  type: string;
  label: string;
  icon: string;
  status?: string;
}

export interface StatusBarProps {
  items: StatusBarItem[];
  className?: string;
  onItemClick?: (itemType: string) => void;
}

// ============================================
// StatusBar
// ============================================

export const StatusBar = forwardRef<HTMLDivElement, StatusBarProps>(
  function StatusBar({ items, className, onItemClick }, ref) {
    return (
      <FlexBox ref={ref} className={clsx("StatusBar", "ok-status-bar", className)}>
        {items.map((item, index) => (
          <FlexBox key={item.type} className="StatusBar__group">
            <FlexBox
              className={clsx(
                "StatusBar__item",
                onItemClick && "StatusBar__item--clickable",
              )}
              onClick={() => onItemClick?.(item.type)}
            >
              <Img
                src={item.icon}
                alt={item.label}
                className={clsx(
                  "StatusBar__icon",
                  item.type === "rag" && "StatusBar__icon--small",
                )}
              />
              <Typography className="StatusBar__label">
                {item.label}
              </Typography>
            </FlexBox>
            {index < items.length - 1 && (
              <Divider
                orientation="vertical"
                className="StatusBar__divider"
              />
            )}
          </FlexBox>
        ))}
      </FlexBox>
    );
  },
);
