// ============================================
// layouts/AuthLayout — 인증 페이지 레이아웃
// Grid 2열 구조: 좌측 폼 + 우측 배경 이미지
// ============================================

import { Grid, Img } from "@/components";
import { Outlet } from "react-router-dom";
import "./AuthLayout.scss";

export interface AuthLayoutProps {
  /** 배경 이미지 URL */
  backgroundImage?: string;
  /** 폼 영역 비율 (12 기준, 기본 8) */
  formColumns?: number;
  /** 배경 영역 비율 (12 기준, 기본 4) */
  backgroundColumns?: number;
}

export function AuthLayout({
  backgroundImage = "/assets/img/login/login_bg.png",
  formColumns = 8,
  backgroundColumns = 4
}: AuthLayoutProps) {
  return (
    <Grid container className="AuthLayout__root ok-auth-layout">
      {/* 좌측: 폼 영역 */}
      <Grid
        size={{ xs: 12, md: formColumns }}
        className="AuthLayout__form-area"
      >
        <Outlet />
      </Grid>

      {/* 우측: 배경 이미지 영역 (backgroundColumns > 0일 때만 표시) */}
      {backgroundColumns > 0 && (
        <Grid size={{ xs: 0, md: backgroundColumns }}>
          <Img
            className="AuthLayout__bg-image"
            src={backgroundImage}
            alt="배경"
          />
        </Grid>
      )}
    </Grid>
  );
}
