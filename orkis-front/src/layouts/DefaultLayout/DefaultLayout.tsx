// ============================================
// layouts/DefaultLayout — 기본 레이아웃
// 전체 화면 배경 + 중앙 정렬
// ============================================

import { FlexBox } from "@/components";
import { Outlet } from "react-router-dom";
import "./DefaultLayout.scss";

export function DefaultLayout() {
  return (
    <FlexBox className="DefaultLayout__root ok-default-layout" justify="center">
      <Outlet />
    </FlexBox>
  );
}
