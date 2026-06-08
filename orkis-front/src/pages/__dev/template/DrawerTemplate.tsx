// ============================================
// Drawer 쇼케이스 페이지
// ============================================

import { useState } from "react";
import {
  Typography, Stack, Button, FlexBox, Box, Divider, Drawer, Icon,
  List, ListItemButton, ListItemIcon, ListItemText,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

type Anchor = "left" | "right" | "top" | "bottom";

function DrawerContent({ onClose }: { onClose: () => void }) {
  const items = ["받은편지함", "중요", "보낸편지함", "임시보관함"];
  return (
    <Box width={260} role="presentation">
      <Box p={2}>
        <Typography variant="h6">메뉴</Typography>
      </Box>
      <Divider />
      <List>
        {items.map((text, idx) => (
          <ListItemButton key={text} onClick={onClose}>
            <ListItemIcon>
              {idx % 2 === 0 ? <Icon mui>InboxIcon</Icon> : <Icon mui>MailIcon</Icon>}
            </ListItemIcon>
            <ListItemText primary={text} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

export function DrawerTemplate() {
  const [open, setOpen] = useState<Record<Anchor, boolean>>({
    left: false, right: false, top: false, bottom: false,
  });

  const toggleDrawer = (anchor: Anchor, value: boolean) => () => {
    setOpen((prev) => ({ ...prev, [anchor]: value }));
  };

  const [persistentOpen, setPersistentOpen] = useState(false);

  return (
    <Stack className="ok-drawer-template" spacing={4}>
      <Typography variant="h4">Drawer</Typography>

      {/* Temporary Drawer — anchor 방향 */}
      <ExampleBlock
        title="Temporary Drawer (4 방향)"
        code={`<Drawer
  anchor="left"
  open={open}
  onClose={() => setOpen(false)}
>
  <Box width={260}>
    ...내용...
  </Box>
</Drawer>`}
      >
        <FlexBox gap={2} wrap="wrap">
          {(["left", "right", "top", "bottom"] as const).map((anchor) => (
            <Button
              key={anchor}
              variant="outlined"
              onClick={toggleDrawer(anchor, true)}
            >
              {anchor.toUpperCase()}
            </Button>
          ))}
        </FlexBox>

        {(["left", "right", "top", "bottom"] as const).map((anchor) => (
          <Drawer
            key={anchor}
            anchor={anchor}
            open={open[anchor]}
            onClose={toggleDrawer(anchor, false)}
          >
            {anchor === "top" || anchor === "bottom" ? (
              <Box p={3} minHeight={200}>
                <Typography variant="h6">{anchor} Drawer</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {anchor} 방향 Drawer 예시입니다.
                </Typography>
              </Box>
            ) : (
              <DrawerContent onClose={toggleDrawer(anchor, false)} />
            )}
          </Drawer>
        ))}
      </ExampleBlock>

      {/* Persistent Drawer */}
      <ExampleBlock
        title="Persistent Drawer"
        code={`<Drawer
  variant="persistent"
  anchor="left"
  open={open}
>
  ...내용...
</Drawer>`}
      >
        <Box position="relative" height={300} overflow="hidden" border="1px solid" borderColor="divider" borderRadius={1}>
          <Drawer
            variant="persistent"
            anchor="left"
            open={persistentOpen}
            PaperProps={{
              style: { position: "absolute", width: 220 },
            }}
            ModalProps={{ keepMounted: true }}
          >
            <Box p={2}>
              <Typography variant="subtitle2">사이드바</Typography>
            </Box>
            <Divider />
            <List dense>
              {["메뉴 A", "메뉴 B", "메뉴 C"].map((text) => (
                <ListItemButton key={text}>
                  <ListItemText primary={text} />
                </ListItemButton>
              ))}
            </List>
          </Drawer>

          <Box
            p={3}
            ml={persistentOpen ? "220px" : 0}
            style={{ transition: "margin-left 225ms" }}
          >
            <Button
              variant="contained"
              size="small"
              onClick={() => setPersistentOpen((v) => !v)}
            >
              {persistentOpen ? "닫기" : "열기"}
            </Button>
            <Typography variant="body2" mt={2}>
              persistent Drawer는 열린 상태에서도 메인 영역이 함께 밀려납니다.
            </Typography>
          </Box>
        </Box>
      </ExampleBlock>
    </Stack>
  );
}
