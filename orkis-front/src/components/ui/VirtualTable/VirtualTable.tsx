import {
  forwardRef,
  useMemo,
  type HTMLAttributes,
  type ReactElement,
} from "react";
import clsx from "clsx";
import { TableVirtuoso, type TableComponents } from "react-virtuoso";
import {
  Box,
  Table,
  TableBody,
  TableHead,
  TableRow,
} from "@/components";
import "./VirtualTable.scss";
import type { VirtualTableProps } from "./VirtualTable.types";

/**
 * react-virtuoso 의 TableVirtuoso 1:1 캡슐화.
 * 외부에서 react-virtuoso 를 직접 import 하지 말 것 — 본 컴포넌트와
 * components/ui/VirtualMessageList 두 곳에만 의존을 가둔다.
 */
export function VirtualTable<T>(props: VirtualTableProps<T>): ReactElement {
  const {
    data,
    itemContent,
    fixedHeaderContent,
    classNames,
    size = "medium",
  } = props;

  // classNames 객체가 inline 으로 매 렌더 새 reference 라도 각 string 이 안정이면
  // components 메모이즈가 유지되도록 deps 를 string 단위로 분해.
  const scrollerCN = classNames?.scroller;
  const tableCN = classNames?.table;
  const tableHeadCN = classNames?.tableHead;
  const tableRowCN = classNames?.tableRow;
  const tableBodyCN = classNames?.tableBody;

  const components = useMemo<TableComponents<T>>(() => {
    const Scroller = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
      function VtScroller({ className, ...rest }, ref) {
        return (
          <Box
            {...rest}
            ref={ref}
            className={clsx(scrollerCN, className)}
          />
        );
      },
    );

    const TableEl = forwardRef<
      HTMLTableElement,
      HTMLAttributes<HTMLTableElement>
    >(function VtTable({ className, ...rest }, ref) {
      return (
        <Table
          {...rest}
          ref={ref}
          className={clsx(tableCN, className)}
          size={size}
        />
      );
    });

    const TableHeadEl = forwardRef<
      HTMLTableSectionElement,
      HTMLAttributes<HTMLTableSectionElement>
    >(function VtTableHead({ className, ...rest }, ref) {
      return (
        <TableHead
          {...rest}
          ref={ref}
          className={clsx(tableHeadCN, className)}
        />
      );
    });

    const TableRowEl = forwardRef<
      HTMLTableRowElement,
      HTMLAttributes<HTMLTableRowElement>
    >(function VtTableRow({ className, ...rest }, ref) {
      return (
        <TableRow
          {...rest}
          ref={ref}
          className={clsx(tableRowCN, className)}
        />
      );
    });

    const TableBodyEl = forwardRef<
      HTMLTableSectionElement,
      HTMLAttributes<HTMLTableSectionElement>
    >(function VtTableBody({ className, ...rest }, ref) {
      return (
        <TableBody
          {...rest}
          ref={ref}
          className={clsx(tableBodyCN, className)}
        />
      );
    });

    return {
      Scroller,
      Table: TableEl,
      TableHead: TableHeadEl,
      TableRow: TableRowEl,
      TableBody: TableBodyEl,
    };
  }, [scrollerCN, tableCN, tableHeadCN, tableRowCN, tableBodyCN, size]);

  return (
    <TableVirtuoso<T, unknown>
      className={clsx("VirtualTable__root", classNames?.root)}
      data={data}
      components={components}
      fixedHeaderContent={fixedHeaderContent}
      itemContent={itemContent}
    />
  );
}
