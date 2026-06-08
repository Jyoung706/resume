// ============================================
// List + Collapse 쇼케이스 페이지
// ============================================

import { useState } from "react";
import {
  Typography, Stack, Paper, Box,
  List, ListItemButton, ListItemIcon, ListItemText, Collapse,
  InboxIcon, MailIcon, DraftsIcon, SendIcon, ExpandLess, ExpandMore,
  StarIcon, FolderIcon, DeleteIcon,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function ListTemplate() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [nestedOpen, setNestedOpen] = useState(true);

  return (
    <Stack className="ok-list-template" spacing={4}>
      <Typography variant="h4">List & Collapse</Typography>

      {/* Basic List */}
      <ExampleBlock
        title="Basic List"
        code={`<List>
  <ListItemButton>
    <ListItemIcon><InboxIcon /></ListItemIcon>
    <ListItemText primary="Inbox" />
  </ListItemButton>
  <ListItemButton>
    <ListItemIcon><DraftsIcon /></ListItemIcon>
    <ListItemText primary="Drafts" />
  </ListItemButton>
</List>`}
      >
        <Paper rounded="md" style={{ maxWidth: 360 }}>
          <List>
            <ListItemButton>
              <ListItemIcon><InboxIcon /></ListItemIcon>
              <ListItemText primary="받은편지함" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon><DraftsIcon /></ListItemIcon>
              <ListItemText primary="임시보관함" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon><SendIcon /></ListItemIcon>
              <ListItemText primary="보낸편지함" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon><MailIcon /></ListItemIcon>
              <ListItemText primary="전체메일" />
            </ListItemButton>
          </List>
        </Paper>
      </ExampleBlock>

      {/* Selected Item */}
      <ExampleBlock
        title="Selected State"
        code={`<ListItemButton
  selected={selectedIndex === 0}
  onClick={() => setSelectedIndex(0)}
>
  <ListItemText primary="항목" />
</ListItemButton>`}
      >
        <Paper rounded="md" style={{ maxWidth: 360 }}>
          <List>
            {["대시보드", "프로젝트", "설정", "프로필"].map((text, idx) => (
              <ListItemButton
                key={text}
                selected={selectedIndex === idx}
                onClick={() => setSelectedIndex(idx)}
              >
                <ListItemText primary={text} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </ExampleBlock>

      {/* Secondary Text */}
      <ExampleBlock
        title="Primary + Secondary Text"
        code={`<ListItemText
  primary="제목"
  secondary="부가 설명 텍스트"
/>`}
      >
        <Paper rounded="md" style={{ maxWidth: 360 }}>
          <List>
            <ListItemButton>
              <ListItemIcon><FolderIcon /></ListItemIcon>
              <ListItemText primary="문서" secondary="12개 파일" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon><FolderIcon /></ListItemIcon>
              <ListItemText primary="이미지" secondary="48개 파일" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon><FolderIcon /></ListItemIcon>
              <ListItemText primary="다운로드" secondary="3개 파일" />
            </ListItemButton>
          </List>
        </Paper>
      </ExampleBlock>

      {/* Nested List with Collapse */}
      <ExampleBlock
        title="Nested List (Collapse)"
        code={`<ListItemButton onClick={() => setOpen(!open)}>
  <ListItemText primary="카테고리" />
  {open ? <ExpandLess /> : <ExpandMore />}
</ListItemButton>
<Collapse in={open}>
  <List disablePadding>
    <ListItemButton style={{ paddingLeft: 32 }}>
      <ListItemText primary="하위 항목" />
    </ListItemButton>
  </List>
</Collapse>`}
      >
        <Paper rounded="md" style={{ maxWidth: 360 }}>
          <List>
            <ListItemButton>
              <ListItemIcon><SendIcon /></ListItemIcon>
              <ListItemText primary="보낸편지함" />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon><DraftsIcon /></ListItemIcon>
              <ListItemText primary="임시보관함" />
            </ListItemButton>

            {/* Nested */}
            <ListItemButton onClick={() => setNestedOpen(!nestedOpen)}>
              <ListItemIcon><InboxIcon /></ListItemIcon>
              <ListItemText primary="받은편지함" />
              {nestedOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={nestedOpen}>
              <List disablePadding>
                <ListItemButton>
                  <ListItemIcon><StarIcon /></ListItemIcon>
                  <ListItemText primary="중요" />
                </ListItemButton>
                <ListItemButton>
                  <ListItemIcon><DeleteIcon /></ListItemIcon>
                  <ListItemText primary="휴지통" />
                </ListItemButton>
              </List>
            </Collapse>
          </List>
        </Paper>
      </ExampleBlock>

      {/* Dense List */}
      <ExampleBlock
        title="Dense List"
        code={`<List dense>
  <ListItemButton>...</ListItemButton>
</List>`}
      >
        <Paper rounded="md" style={{ maxWidth: 360 }}>
          <Box p={1}>
            <Typography variant="caption" color="text.secondary" px={2}>
              dense=true (컴팩트 리스트)
            </Typography>
          </Box>
          <List dense>
            {["항목 1", "항목 2", "항목 3", "항목 4", "항목 5"].map((text) => (
              <ListItemButton key={text}>
                <ListItemText primary={text} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </ExampleBlock>
    </Stack>
  );
}
