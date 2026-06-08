// ============================================
// Doc 메인 페이지 — 컴포넌트 API 문서 네비게이션
// ============================================

import { useNavigate } from "react-router-dom";
import {
  Typography, Paper, FlexBox, Grid, Box, Divider, CardActionArea,
} from "@/components";
import { groupByCategory, type DocCategory } from "./_doc-data";

const CATEGORY_LABELS: Record<DocCategory, { title: string; desc: string }> = {
  base: { title: "Base", desc: "MUI 1:1 래핑 기본 컴포넌트" },
  layout: { title: "Layout", desc: "레이아웃 유틸리티 컴포넌트" },
  ui: { title: "UI", desc: "복합 UI 컴포넌트" },
  domain: { title: "Domain", desc: "도메인 특화 컴포넌트" },
  "page-local": { title: "Page-Local", desc: "페이지 전용 로컬 컴포넌트" },
};

const CATEGORY_ORDER: DocCategory[] = ["base", "layout", "ui", "domain", "page-local"];

export function DocPage() {
  const navigate = useNavigate();
  const grouped = groupByCategory();

  return (
    <Box className="ok-doc-page">
      <Typography variant="h4" mb={1}>
        Component API
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        모든 컴포넌트의 Props 레퍼런스 문서입니다.
      </Typography>

      {CATEGORY_ORDER.map((cat) => (
        <Box key={cat} mb={5}>
          <FlexBox align="baseline" gap={1.5} mb={2}>
            <Typography variant="h5">{CATEGORY_LABELS[cat].title}</Typography>
            <Typography variant="body2" color="text.secondary">
              — {CATEGORY_LABELS[cat].desc}
            </Typography>
          </FlexBox>
          <Divider mb="sm" />

          <Grid container spacing={1.5}>
            {grouped[cat].map((doc) => (
              <Grid key={doc.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Paper variant="outlined" rounded="sm" height="100%">
                  <CardActionArea
                    onClick={() => navigate(`/doc/${doc.name}`)}
                    p="sm"
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {doc.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      overflow="hidden"
                      display="-webkit-box"
                      style={{
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {doc.description}
                    </Typography>
                  </CardActionArea>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
