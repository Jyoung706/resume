// ============================================
// base/Table — MUI Table 관련 래퍼
// ============================================

import { forwardRef } from "react";
import clsx from "clsx";
import MuiTable, { type TableProps as MuiTableProps } from "@mui/material/Table";
import MuiTableHead, {
  type TableHeadProps as MuiTableHeadProps,
} from "@mui/material/TableHead";
import MuiTableBody, {
  type TableBodyProps as MuiTableBodyProps,
} from "@mui/material/TableBody";
import MuiTableRow, {
  type TableRowProps as MuiTableRowProps,
} from "@mui/material/TableRow";
import MuiTableCell, {
  type TableCellProps as MuiTableCellProps,
} from "@mui/material/TableCell";
import {
  useDefaultComponentSize,
  sizeClass,
  toMuiSmallMedium,
  type ComponentSize,
} from "@/design-system";
import {
  type ConvenienceProps,
  splitConvenienceProps,
  convenienceToSx,
  mergeSx,
  sizeConvenienceClassNames,
} from "../types";
import "./Table.scss";

/** MUI 시스템 props와 ConvenienceProps 충돌 방지용 Omit 키 */
type OmitKeys = "color" | "size" | keyof ConvenienceProps;

// --- Table ---
export interface TableProps extends ConvenienceProps, Omit<MuiTableProps, OmitKeys> {
  size?: ComponentSize;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  function Table(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] = splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTableProps["sx"]);

    return (
      <MuiTable
        ref={ref}
        className={clsx(
          "Table__base",
          "ok-table",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        size={toMuiSmallMedium(size)}
        {...muiProps}
      />
    );
  },
);

// --- TableHead ---
export interface TableHeadProps extends ConvenienceProps, Omit<MuiTableHeadProps, OmitKeys> {
  size?: ComponentSize;
}

export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  function TableHead(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTableHeadProps["sx"]);

    return (
      <MuiTableHead
        ref={ref}
        className={clsx(
          "Table__head",
          "ok-table-head",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);

// --- TableBody ---
export interface TableBodyProps extends ConvenienceProps, Omit<MuiTableBodyProps, OmitKeys> {
  size?: ComponentSize;
}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTableBodyProps["sx"]);

    return (
      <MuiTableBody
        ref={ref}
        className={clsx(
          "Table__body",
          "ok-table-body",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);

// --- TableRow ---
export interface TableRowProps extends ConvenienceProps, Omit<MuiTableRowProps, OmitKeys> {
  size?: ComponentSize;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTableRowProps["sx"]);

    return (
      <MuiTableRow
        ref={ref}
        className={clsx(
          "Table__row",
          "ok-table-row",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        {...muiProps}
      />
    );
  },
);

// --- TableCell ---
export interface TableCellProps
  extends ConvenienceProps,
    Omit<MuiTableCellProps, OmitKeys | "size"> {
  size?: ComponentSize;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell(props, ref) {
    const defaultSize = useDefaultComponentSize();
    const [convProps, { sx, className, size = defaultSize, ...muiProps }] =
      splitConvenienceProps(props, ["width", "height"]);
    const convSx = convenienceToSx(convProps);
    const mergedSx = mergeSx(convSx, sx as MuiTableCellProps["sx"]);

    return (
      <MuiTableCell
        ref={ref}
        className={clsx(
          "Table__cell",
          "ok-table-cell",
          sizeClass(size),
          sizeConvenienceClassNames(convProps),
          className,
        )}
        sx={mergedSx}
        size={toMuiSmallMedium(size)}
        {...muiProps}
      />
    );
  },
);
