// ============================================
// Doc 상세 페이지 — 개별 컴포넌트 API
// ============================================

import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Typography, Stack, FlexBox, Box, Paper, Button, Divider, Link, IconButton,
  OpenInNewIcon, ArrowBackIcon, CodeIcon,
} from "@/components";
import { PropTable } from "./parts";
import { findDoc } from "./_doc-data";

const CATEGORY_COLORS: Record<string, string> = {
  base: "primary.main",
  layout: "info.main",
  ui: "success.main",
  domain: "warning.main",
};

export function DocDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const doc = name ? findDoc(name) : undefined;

  if (!doc) {
    return (
      <Stack spacing={2} alignItems="center" py={8}>
        <Typography variant="h5">컴포넌트를 찾을 수 없습니다</Typography>
        <Typography variant="body2" color="text.secondary">
          &quot;{name}&quot; 문서가 존재하지 않습니다.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/doc")}>
          문서 목록으로
        </Button>
      </Stack>
    );
  }

  return (
    <Box className="ok-doc-detail-page">
      {/* 헤더 */}
      <FlexBox align="center" gap={1} mb={1}>
        <IconButton size="small" onClick={() => navigate("/doc")}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h4">{doc.name}</Typography>
        <Box
          component="span"
          px={1}
          py={0.25}
          rounded="xs"
          fontSize="0.75rem"
          fontWeight={600}
          color="white"
          bgcolor={CATEGORY_COLORS[doc.category] ?? "grey.500"}
        >
          {doc.category}
        </Box>
      </FlexBox>

      <Typography variant="body1" color="text.secondary" mb={2} ml={5}>
        {doc.description}
      </Typography>

      {/* 메타 정보 */}
      <Paper variant="outlined" rounded="sm" p={2} mb={3} ml={5}>
        <Stack spacing={1}>
          {doc.extends && (
            <FlexBox gap={1} align="baseline">
              <Typography variant="caption" fontWeight={700} minWidth={60}>
                extends
              </Typography>
              <Box
                component="code"
                fontSize="0.8125rem"
                color="text.secondary"
              >
                {doc.extends}
              </Box>
            </FlexBox>
          )}
          <FlexBox gap={1.5} wrap="wrap">
            {doc.muiRef && (
              <Link
                href={doc.muiRef}
                target="_blank"
                rel="noopener"
                variant="caption"
                underline="hover"
              >
                <FlexBox align="center" gap={0.5}>
                  MUI Docs <OpenInNewIcon style={{ fontSize: 12 }} />
                </FlexBox>
              </Link>
            )}
            {doc.templatePath && (
              <Link
                component={RouterLink}
                to={doc.templatePath}
                variant="caption"
                underline="hover"
              >
                <FlexBox align="center" gap={0.5}>
                  <CodeIcon style={{ fontSize: 12 }} /> Template 예제
                </FlexBox>
              </Link>
            )}
          </FlexBox>
        </Stack>
      </Paper>

      {/* Props 테이블 */}
      <Box ml={5}>
        <Typography variant="h6" mb={1.5}>
          Props
        </Typography>
        {doc.props.length > 0 ? (
          <PropTable props={doc.props} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            커스텀 props 없음. 상속된 MUI/HTML props만 사용합니다.
          </Typography>
        )}
      </Box>

      {/* 하단 네비게이션 */}
      <Divider my="lg" />
      <FlexBox justify="center">
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate("/doc")}
          startIcon={<ArrowBackIcon />}
        >
          전체 문서 목록
        </Button>
      </FlexBox>
    </Box>
  );
}
