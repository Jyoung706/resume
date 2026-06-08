// ============================================
// AppHeader & Sidebar & NavList 쇼케이스 페이지
// ============================================

import { useState } from "react";
import {
  Typography, Stack, FlexBox, Box, Paper, Button, IconButton, Divider, Icon,
  AppHeader, Sidebar, NavList,
  type NavItem,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const SAMPLE_NAV_ITEMS: NavItem[] = [
  { label: "홈", path: "/home", icon: <Icon mui>HomeIcon</Icon> },
  { label: "대시보드", path: "/dashboard", icon: <Icon mui>DashboardIcon</Icon> },
  {
    label: "보고서",
    path: "/reports",
    icon: <Icon mui>BarChartIcon</Icon>,
    children: [
      { label: "월간 보고서", path: "/reports/monthly", icon: <Icon mui>ArticleIcon</Icon> },
      { label: "연간 보고서", path: "/reports/annual", icon: <Icon mui>ArticleIcon</Icon> },
    ],
  },
  { label: "설정", path: "/settings", icon: <Icon mui>SettingsIcon</Icon> },
];

export function NavigationTemplate() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState("/home");
  const [sidebarVariant, setSidebarVariant] = useState<"temporary" | "persistent">("temporary");

  return (
    <Stack className="ok-navigation-template" spacing={4}>
      <Typography variant="h4">AppHeader & Sidebar & NavList</Typography>

      {/* AppHeader — 기본 */}
      <ExampleBlock
        title="AppHeader — 기본"
        code={`<AppHeader
  leftActions={<IconButton color="inherit"><MenuIcon /></IconButton>}
  rightActions={<IconButton color="inherit"><PersonIcon /></IconButton>}
>
  <Typography variant="h6" grow>My App</Typography>
</AppHeader>`}
      >
        <Paper variant="outlined" style={{ overflow: "hidden" }}>
          <AppHeader
            position="static"
            leftActions={
              <IconButton color="inherit" mr="sm">
                <Icon mui>MenuIcon</Icon>
              </IconButton>
            }
            rightActions={
              <IconButton color="inherit">
                <Icon mui>PersonIcon</Icon>
              </IconButton>
            }
          >
            <Typography variant="h6" grow>
              My App
            </Typography>
          </AppHeader>
        </Paper>
      </ExampleBlock>

      {/* AppHeader — Color */}
      <ExampleBlock
        title="AppHeader — Color & Elevation"
        code={`<AppHeader color="primary" elevation={2}>...</AppHeader>
<AppHeader color="transparent" elevation={0}>...</AppHeader>`}
      >
        <Stack spacing={2}>
          {(
            [
              { color: "default", elevation: 1 },
              { color: "primary", elevation: 2 },
              { color: "transparent", elevation: 0 },
            ] as const
          ).map(({ color, elevation }) => (
            <Paper key={color} variant="outlined" style={{ overflow: "hidden" }}>
              <AppHeader position="static" color={color} elevation={elevation}>
                <Typography variant="h6" grow>
                  color=&quot;{color}&quot; elevation={elevation}
                </Typography>
              </AppHeader>
            </Paper>
          ))}
        </Stack>
      </ExampleBlock>

      {/* NavList */}
      <ExampleBlock
        title="NavList — 네비게이션 리스트"
        code={`<NavList
  items={[
    { label: "홈", path: "/home", icon: <HomeIcon /> },
    { label: "보고서", path: "/reports", children: [...] },
    { label: "설정", path: "/settings", icon: <SettingsIcon /> },
  ]}
  selectedPath="/home"
  onNavigate={(path) => setSelectedPath(path)}
/>`}
      >
        <FlexBox gap={3} wrap="wrap">
          <Paper variant="outlined" width={280}>
            <NavList
              items={SAMPLE_NAV_ITEMS}
              selectedPath={selectedPath}
              onNavigate={setSelectedPath}
            />
          </Paper>
          <Box>
            <Typography variant="body2" color="text.secondary">
              선택된 경로:
            </Typography>
            <Typography variant="h6" color="primary">
              {selectedPath}
            </Typography>
          </Box>
        </FlexBox>
      </ExampleBlock>

      {/* Sidebar */}
      <ExampleBlock
        title="Sidebar — Drawer 복합 컴포넌트"
        code={`<Sidebar
  open={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  title="메뉴"
  variant="temporary"
>
  <NavList items={items} onNavigate={handleNavigate} />
</Sidebar>`}
      >
        <FlexBox gap={2} wrap="wrap" align="center">
          <Button
            variant="contained"
            onClick={() => {
              setSidebarVariant("temporary");
              setSidebarOpen(true);
            }}
          >
            Temporary Sidebar 열기
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setSidebarVariant("persistent");
              setSidebarOpen((v) => !v);
            }}
          >
            Persistent Sidebar 토글
          </Button>
        </FlexBox>

        {/* Persistent 예제 미리보기 */}
        {sidebarVariant === "persistent" && (
          <Box mt={2}>
            <Paper
              variant="outlined"
              style={{ overflow: "hidden", position: "relative", height: 300 }}
            >
              <FlexBox height="100%">
                <Box
                  width={sidebarOpen ? 240 : 0}
                  overflow="hidden"
                  flexShrink={0}
                  borderRight={sidebarOpen ? 1 : 0}
                  borderColor="divider"
                  transition="width 0.3s"
                >
                  <Box p={2}>
                    <Typography variant="h6" fontWeight={700} mb={1}>
                      메뉴
                    </Typography>
                  </Box>
                  <Divider />
                  <NavList
                    items={SAMPLE_NAV_ITEMS}
                    selectedPath={selectedPath}
                    onNavigate={setSelectedPath}
                  />
                </Box>
                <Box p={3} grow>
                  <Typography variant="body1">
                    메인 콘텐츠 영역 (persistent sidebar 데모)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    선택된 경로: {selectedPath}
                  </Typography>
                </Box>
              </FlexBox>
            </Paper>
          </Box>
        )}

        {/* Temporary Sidebar (실제 Drawer) */}
        {sidebarVariant === "temporary" && (
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            title="메뉴"
            variant="temporary"
          >
            <NavList
              items={SAMPLE_NAV_ITEMS}
              selectedPath={selectedPath}
              onNavigate={(path) => {
                setSelectedPath(path);
                setSidebarOpen(false);
              }}
            />
          </Sidebar>
        )}
      </ExampleBlock>
    </Stack>
  );
}
