// ============================================
// PanelHeader 검증 페이지 (T1-1 검증용)
// ============================================
// title/subtitle/leading/actions/divider 슬롯 조합 시각 확인.
// 화이트리스트 적용처(pro/SnippetsPanel 등)의 마크업 시뮬레이션.
// ============================================

import {
  Button,
  Icon,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@/components";
import { PanelHeader } from "@/components/ui";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function PanelHeaderTemplate() {
  return (
    <Stack className="ok-panel-header-template" spacing={4}>
      <Typography variant="h4">PanelHeader</Typography>

      <Typography variant="body2" color="text.secondary">
        T1-1 검증: title / subtitle / leading / actions / divider 슬롯 조합.
        시각은 <code>--alias-panel-header-*</code> 토큰이 책임.
      </Typography>

      {/* 기본 — title만 */}
      <ExampleBlock
        title="기본 (title만)"
        code={`<PanelHeader title="스니펫" />`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader title="스니펫" />
        </Paper>
      </ExampleBlock>

      {/* title + actions (가장 흔한 사용처) */}
      <ExampleBlock
        title="title + actions (pro/SnippetsPanel 패턴)"
        code={`<PanelHeader
  title="스니펫"
  actions={
    <IconButton size="small" aria-label="추가">
      <AddIcon />
    </IconButton>
  }
/>`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader
            title="스니펫"
            actions={
              <IconButton size="small" aria-label="추가">
                <Icon mui size="small">AddIcon</Icon>
              </IconButton>
            }
          />
        </Paper>
      </ExampleBlock>

      {/* title + subtitle */}
      <ExampleBlock
        title="title + subtitle"
        code={`<PanelHeader title="스키마" subtitle="ORKIS_DB / public" />`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader title="스키마" subtitle="ORKIS_DB / public" />
        </Paper>
      </ExampleBlock>

      {/* title + subtitle + leading + actions */}
      <ExampleBlock
        title="전체 슬롯 (leading + title + subtitle + actions)"
        code={`<PanelHeader
  leading={<Icon mui>StorageIcon</Icon>}
  title="스키마 브라우저"
  subtitle="ORKIS_DB / public"
  actions={
    <>
      <IconButton size="small" aria-label="새로고침"><RefreshIcon /></IconButton>
      <IconButton size="small" aria-label="더보기"><MoreVertIcon /></IconButton>
    </>
  }
/>`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader
            leading={<Icon mui>StorageIcon</Icon>}
            title="스키마 브라우저"
            subtitle="ORKIS_DB / public"
            actions={
              <>
                <IconButton size="small" aria-label="새로고침">
                  <Icon mui size="small">RefreshIcon</Icon>
                </IconButton>
                <IconButton size="small" aria-label="더보기">
                  <Icon mui size="small">MoreVertIcon</Icon>
                </IconButton>
              </>
            }
          />
        </Paper>
      </ExampleBlock>

      {/* divider */}
      <ExampleBlock
        title="divider"
        code={`<PanelHeader title="히스토리" divider />`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader title="히스토리" divider />
        </Paper>
      </ExampleBlock>

      {/* size (small/medium/large) */}
      <ExampleBlock
        title="size (xsmall ~ xlarge)"
        code={`<PanelHeader size="xsmall" title="xsmall" />
<PanelHeader size="small" title="small" />
<PanelHeader size="medium" title="medium" />
<PanelHeader size="large" title="large" />
<PanelHeader size="xlarge" title="xlarge" />`}
      >
        <Stack spacing={1}>
          {(["xsmall", "small", "medium", "large", "xlarge"] as const).map(
            (size) => (
              <Paper key={size} variant="outlined" p={2}>
                <PanelHeader size={size} title={`size="${size}"`} />
              </Paper>
            ),
          )}
        </Stack>
      </ExampleBlock>

      {/* ReactNode title (동적 modifier 케이스) */}
      <ExampleBlock
        title="title 으로 ReactNode 전달 (동적 modifier)"
        code={`<PanelHeader
  title={
    <FlexBox align="center" gap={0.5}>
      <span>읽지 않음</span>
      <Typography variant="caption" color="error">12</Typography>
    </FlexBox>
  }
/>`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader
            title={
              <span>
                읽지 않음{" "}
                <Typography
                  variant="caption"
                  color="error"
                  component="span"
                >
                  (12)
                </Typography>
              </span>
            }
          />
        </Paper>
      </ExampleBlock>

      {/* actions에 Button + IconButton 혼합 */}
      <ExampleBlock
        title="actions 슬롯에 Button + IconButton 혼합"
        code={`<PanelHeader
  title="필터"
  actions={
    <>
      <Button size="xsmall" variant="text">리셋</Button>
      <IconButton size="small"><MoreVertIcon /></IconButton>
    </>
  }
/>`}
      >
        <Paper variant="outlined" p={2}>
          <PanelHeader
            title="필터"
            actions={
              <>
                <Button size="xsmall" variant="text">
                  리셋
                </Button>
                <IconButton size="small" aria-label="더보기">
                  <Icon mui size="small">MoreVertIcon</Icon>
                </IconButton>
              </>
            }
          />
        </Paper>
      </ExampleBlock>
    </Stack>
  );
}
