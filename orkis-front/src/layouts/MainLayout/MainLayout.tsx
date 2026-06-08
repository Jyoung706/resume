// ============================================
// layouts/MainLayout — 사이드바 + 헤더 + 콘텐츠
// ============================================

import {
  AppHeader,
  ArticleIcon,
  Box,
  DashboardIcon,
  DescriptionIcon,
  ErrorOutlineIcon,
  FlexBox,
  IconButton,
  LoginIcon,
  MenuIcon,
  MenuItem,
  NavList,
  PaletteIcon,
  PaymentIcon,
  PersonAddIcon,
  Select,
  Sidebar,
  Stack,
  ViewListIcon,
  type NavItem
} from "@/components";
import {
  THEME_OPTIONS,
  useThemeModeContext,
  type ThemeMode
} from "@/design-system";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./MainLayout.scss";


// dev-only 페이지 네비게이션 (프로덕션 사이드바에는 노출하지 않음)
// 현재 MainLayout은 dev-only 페이지에서만 사용된다.
// 향후 프로덕션 페이지(관리자 등)에서 사용 시 isDev 분기 또는 canShow 헬퍼 도입.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",      path: "/template/dashboard", icon: <DashboardIcon /> },
  { label: "Templates",      path: "/template",           icon: <PaletteIcon /> },
  { label: "All Components", path: "/template/all",       icon: <ViewListIcon /> },
  { label: "API Docs",       path: "/doc",                icon: <DescriptionIcon /> },
  {
    label: "Pages",
    path: "/pages",
    icon: <ArticleIcon />,
    children: [
      {
        label: "UserTypeSelection",
        path: "/preview/user-type-selection",
        icon: <PaymentIcon />
      },
      { label: "Login",     path: "/preview/login",  icon: <LoginIcon /> },
      { label: "Signup",    path: "/preview/signup",  icon: <PersonAddIcon /> },
      { label: "Error Hub", path: "/__dev/error",     icon: <ErrorOutlineIcon /> }
    ]
  }
];

export function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode } = useThemeModeContext();

  return (
    <FlexBox className="MainLayout__wrapper ok-main-layout">
      {/* Sidebar */}
      <Sidebar open={drawerOpen} title="ORKIS UI">
        <NavList
          items={NAV_ITEMS}
          selectedPath={location.pathname}
          onNavigate={(path) => navigate(path)}
        />
      </Sidebar>

      {/* Main content area */}
      <Stack className="MainLayout__wrap">
        {/* Header */}
        <AppHeader
          leftActions={
            <IconButton
              // mr={2}
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label="메뉴 토글"
            >
              <MenuIcon />
            </IconButton>
          }
          rightActions={
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as ThemeMode)}
              // size="small"
              // variant="outlined"
            >
              {THEME_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          }
        >
          {/* <Box flexGrow={1} /> */}
        </AppHeader>

        {/* Page content */}
        <Box component="main" className="MainLayout__main ok-main-layout-content">
          <Outlet />
        </Box>
      </Stack>
    </FlexBox>
  );
}
