// ============================================
// AppBar & Toolbar 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Box, Paper,
  AppBar, Toolbar, IconButton, Button,
  MenuIcon, SearchIcon, AccountCircleIcon,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function AppBarTemplate() {
  return (
    <Stack className="ok-appbar-template" spacing={4}>
      <Typography variant="h4">AppBar & Toolbar</Typography>

      {/* AppBar Color */}
      <ExampleBlock
        title="AppBar — Color"
        code={`<AppBar position="static" color="primary">
  <Toolbar>
    <Typography variant="h6">Primary</Typography>
  </Toolbar>
</AppBar>`}
      >
        <Stack spacing={2}>
          {(["default", "primary", "secondary", "transparent"] as const).map(
            (c) => (
              <Paper key={c} variant="outlined" style={{ overflow: "hidden" }}>
                <AppBar position="static" color={c} elevation={c === "transparent" ? 0 : 1}>
                  <Toolbar>
                    <IconButton edge="start" color="inherit" mr="sm">
                      <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" grow>
                      color=&quot;{c}&quot;
                    </Typography>
                    <Button color="inherit">Login</Button>
                  </Toolbar>
                </AppBar>
              </Paper>
            ),
          )}
        </Stack>
      </ExampleBlock>

      {/* Toolbar — 레이아웃 */}
      <ExampleBlock
        title="Toolbar — 레이아웃 구성"
        code={`<AppBar position="static">
  <Toolbar>
    <IconButton edge="start"><MenuIcon /></IconButton>
    <Typography grow>Title</Typography>
    <IconButton><SearchIcon /></IconButton>
    <IconButton edge="end"><AccountCircleIcon /></IconButton>
  </Toolbar>
</AppBar>`}
      >
        <Paper variant="outlined" style={{ overflow: "hidden" }}>
          <AppBar position="static" color="primary">
            <Toolbar>
              <IconButton edge="start" color="inherit" mr="sm">
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" grow>
                My Application
              </Typography>
              <IconButton color="inherit">
                <SearchIcon />
              </IconButton>
              <IconButton edge="end" color="inherit">
                <AccountCircleIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        </Paper>
      </ExampleBlock>

      {/* Toolbar — variant dense */}
      <ExampleBlock
        title="Toolbar — Dense"
        code={`<Toolbar variant="dense">
  <Typography variant="body1">Dense Toolbar</Typography>
</Toolbar>`}
      >
        <Stack spacing={2}>
          <Paper variant="outlined" style={{ overflow: "hidden" }}>
            <AppBar position="static" color="default">
              <Toolbar>
                <Typography variant="h6">Regular Toolbar</Typography>
              </Toolbar>
            </AppBar>
          </Paper>
          <Paper variant="outlined" style={{ overflow: "hidden" }}>
            <AppBar position="static" color="default">
              <Toolbar variant="dense">
                <Typography variant="body1">Dense Toolbar</Typography>
              </Toolbar>
            </AppBar>
          </Paper>
        </Stack>
      </ExampleBlock>

      {/* Toolbar standalone */}
      <ExampleBlock
        title="Toolbar — AppBar 없이 단독 사용"
        code={`<Paper>
  <Toolbar>
    <Typography grow>섹션 헤더</Typography>
    <Button variant="contained" size="small">액션</Button>
  </Toolbar>
</Paper>`}
      >
        <FlexBox direction="column" gap={2}>
          <Paper variant="outlined">
            <Toolbar>
              <Typography variant="h6" grow>섹션 헤더</Typography>
              <Button variant="contained" size="small">새로 만들기</Button>
            </Toolbar>
          </Paper>
          <Paper variant="outlined">
            <Toolbar variant="dense">
              <Box grow>
                <Typography variant="body2" color="text.secondary">
                  3개 항목 선택됨
                </Typography>
              </Box>
              <Button size="small" color="error">삭제</Button>
              <Button size="small">편집</Button>
            </Toolbar>
          </Paper>
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
