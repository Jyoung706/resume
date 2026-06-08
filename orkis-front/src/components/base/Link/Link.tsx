// ============================================
// base/Link — MUI Link + Visual Convenience Props
// ============================================
// MuiLink extends Typography (system component)이므로
// spacing/sizing은 MUI 네이티브 system props 사용, visual만 추가

import { forwardRef } from "react";
import clsx from "clsx";
import MuiLink, { type LinkProps as MuiLinkProps } from "@mui/material/Link";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type VisualConvenienceProps,
  splitVisualConvenienceProps,
  visualConvenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Link.scss";

// --- Link ---

export interface LinkProps extends VisualConvenienceProps, MuiLinkProps {
  /** react-router <Link> 등 polymorphic component 사용 시 경로 */
  to?: string;
  size?: ComponentSize;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  function Link(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const { size = defaultSize, ...rest } = props;
    const [convProps, { sx, className, ...muiProps }] = splitVisualConvenienceProps(rest);
    const convSx = visualConvenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiLinkProps["sx"]);

    return (
      <MuiLink
        ref={ref}
        className={clsx(
          "Link__base",
          "ok-link",
          sizeClass(size),
          sizeConvenienceClassNames(rest as Record<string, unknown>),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);
