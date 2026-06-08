// ============================================
// base/Accordion — MUI Accordion 관련 래퍼
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiAccordion, {
  type AccordionProps as MuiAccordionProps,
} from "@mui/material/Accordion";
import MuiAccordionSummary, {
  type AccordionSummaryProps as MuiAccordionSummaryProps,
} from "@mui/material/AccordionSummary";
import MuiAccordionDetails, {
  type AccordionDetailsProps as MuiAccordionDetailsProps,
} from "@mui/material/AccordionDetails";
import {
  useDefaultComponentSize,
  sizeClass,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Accordion.scss";

// --- Accordion ---
export interface AccordionBaseProps
  extends ConvenienceProps,
    Omit<MuiAccordionProps, "color"> {
  size?: ComponentSize;
}

export const AccordionBase = forwardRef<HTMLDivElement, AccordionBaseProps>(
  function AccordionBase(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiAccordionProps["sx"]);

    return (
      <MuiAccordion
        ref={ref}
        className={clsx(
          "Accordion__base",
          "ok-accordion-base",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);

// --- AccordionSummary ---
export interface AccordionSummaryProps
  extends ConvenienceProps,
    Omit<MuiAccordionSummaryProps, "color"> {
  size?: ComponentSize;
}

export const AccordionSummary = forwardRef<HTMLDivElement, AccordionSummaryProps>(
  function AccordionSummary(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiAccordionSummaryProps["sx"]);

    return (
      <MuiAccordionSummary
        ref={ref}
        className={clsx(
          "Accordion__summary",
          "ok-accordion-summary",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);

// --- AccordionDetails ---
export interface AccordionDetailsProps
  extends ConvenienceProps,
    Omit<MuiAccordionDetailsProps, "color"> {
  size?: ComponentSize;
}

export const AccordionDetails = forwardRef<HTMLDivElement, AccordionDetailsProps>(
  function AccordionDetails(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiAccordionDetailsProps["sx"]);

    return (
      <MuiAccordionDetails
        ref={ref}
        className={clsx(
          "Accordion__details",
          "ok-accordion-details",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  }
);
