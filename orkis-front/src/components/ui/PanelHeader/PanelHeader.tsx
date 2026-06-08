// ============================================
// ui/PanelHeader — 패널 상단 헤더 (title + subtitle + leading/actions slot)
// ============================================
// CSS 보존 정책: 시각은 orkis 테마의 --alias-panel-header-* 토큰이 책임.
// 페이지 SCSS의 기존 {Panel}__header 셀렉터를 className prop으로 위임받아
// child selector로 페이지별 미세 조정 가능.
// ============================================

import { forwardRef, type ReactNode } from "react";
import clsx from "clsx";
import {
  sizeClass,
  useDefaultComponentSize,
  type ComponentSize,
} from "@/design-system";
import { FlexBox } from "../../layout/FlexBox";
import { Typography } from "../../base/Typography";
import { Divider } from "../../base/Divider";
import "./PanelHeader.scss";

export interface PanelHeaderProps {
  /** 패널 타이틀 (string 또는 ReactNode — 동적 modifier·Typography 직접 전달 가능) */
  title: ReactNode;
  /** 부제목 (선택) */
  subtitle?: ReactNode;
  /** title 앞쪽 슬롯 (아이콘·뱃지) */
  leading?: ReactNode;
  /** 오른쪽 액션 슬롯 (버튼·메뉴 등) */
  actions?: ReactNode;
  /** 헤더 아래 구분선 */
  divider?: boolean;
  /** 사이즈 (제목 크기 sizeXxx 클래스로 부여) */
  size?: ComponentSize;
  /** 페이지 SCSS 위임용 className */
  className?: string;
}

/**
 * 패널 상단 헤더 — title + subtitle + leading/actions slot.
 * 시각은 페이지 SCSS와 `--alias-panel-header-*` 토큰이 책임.
 *
 * @since 2026-05-14 (UI uniformity plan r3)
 * @see docs/2026-05-14/orkis-front-ui-uniformity-improvement-plan.md §5.1
 */
export const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>(
  function PanelHeader(
    { title, subtitle, leading, actions, divider, size, className },
    ref,
  ) {
    const defaultSize = useDefaultComponentSize();
    const resolvedSize = size ?? defaultSize;

    return (
      <FlexBox
        ref={ref}
        direction="column"
        className={clsx("PanelHeader", sizeClass(resolvedSize), className)}
      >
        <FlexBox
          align="center"
          justify="space-between"
          className="PanelHeader__bar"
        >
          <FlexBox align="center" className="PanelHeader__leading-title">
            {leading && (
              <div className="PanelHeader__leading">{leading}</div>
            )}
            <FlexBox direction="column" className="PanelHeader__titles">
              <Typography className="PanelHeader__title" component="div">
                {title}
              </Typography>
              {subtitle && (
                <Typography className="PanelHeader__subtitle" component="div">
                  {subtitle}
                </Typography>
              )}
            </FlexBox>
          </FlexBox>
          {actions && (
            <FlexBox align="center" className="PanelHeader__actions">
              {actions}
            </FlexBox>
          )}
        </FlexBox>
        {divider && <Divider className="PanelHeader__divider" />}
      </FlexBox>
    );
  },
);
