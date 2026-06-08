// ============================================
// 버튼 쇼케이스 페이지
// ============================================

import {
  Button, FlexBox, Icon, IconButton, Stack, Typography,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const COLORS = [
  "primary",
  "secondary",
  "error",
  "warning",
  "info",
  "success"
] as const;
const VARIANTS = ["contained", "outlined", "text"] as const;
const SIZES = ["small", "medium", "large"] as const;

export function ButtonTemplate() {
  return (
    <Stack className="ok-button-template" spacing={4}>
      <Typography variant="h4">Button</Typography>
      {/* Variants × Colors */}
      <ExampleBlock
        title="Variants & Colors"
        code={`<Button variant="contained" color="primary">primary</Button>
<Button variant="outlined" color="error">error</Button>
<Button variant="text" color="success">success</Button>`}
      >
        <Stack spacing={2}>
          {VARIANTS.map((variant) => (
            <FlexBox key={variant} gap={1} wrap="wrap" align="center">
              <Typography variant="body2" width={80}>
                {variant}
              </Typography>
              {COLORS.map((color) => (
                <Button key={color} variant={variant} color={color}>
                  {color}
                </Button>
              ))}
            </FlexBox>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Sizes */}
      <ExampleBlock
        title="Sizes"
        code={`<Button variant="contained" size="small">small</Button>
<Button variant="contained" size="medium">medium</Button>
<Button variant="contained" size="large">large</Button>`}
      >
        <FlexBox gap={2} align="center">
          {SIZES.map((size) => (
            <Button key={size} variant="contained" size={size}>
              {size}
            </Button>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Disabled */}
      <ExampleBlock
        title="Disabled"
        code={`<Button variant="contained" disabled>Contained</Button>
<Button variant="outlined" disabled>Outlined</Button>
<Button variant="text" disabled>Text</Button>`}
      >
        <FlexBox gap={2}>
          <Button variant="contained" disabled>
            Contained
          </Button>
          <Button variant="outlined" disabled>
            Outlined
          </Button>
          <Button variant="text" disabled>
            Text
          </Button>
        </FlexBox>
      </ExampleBlock>

      {/* Button widthin Icon */}
      <ExampleBlock
        title="Button within Icon"
        code={`<Button variant="contained" rounded="lg" p={2}>
  rounded="lg" p=2
</Button>
<Button variant="outlined" shadow="md" px={4}>
  shadow="md" px=4
</Button>`}
      >
        <FlexBox gap={2}>
          <Button variant="contained" startIcon={<Icon mui>DeleteIcon</Icon>} rounded="lg" p={2}>
            Delete
          </Button>
          <Button variant="outlined" endIcon={<Icon mui>SendIcon</Icon>} shadow="md" px={4}>
            Send email
          </Button>
        </FlexBox>
      </ExampleBlock>

      {/* Convenience Props */}
      <ExampleBlock
        title="Convenience Props"
        code={`<Button variant="contained" rounded="lg" p={2}>
  rounded="lg" p=2
</Button>
<Button variant="outlined" shadow="md" px={4}>
  shadow="md" px=4
</Button>`}
      >
        <FlexBox gap={2}>
          <Button variant="contained" rounded="lg" p={2}>
            rounded="lg" p=2
          </Button>
          <Button variant="outlined" shadow="md" px={4}>
            shadow="md" px=4
          </Button>
        </FlexBox>
      </ExampleBlock>
      {/* IconButton */}
      <ExampleBlock
        title="IconButton"
        code={`import { IconButton } from "@/components/base/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

<IconButton aria-label="삭제"><DeleteIcon /></IconButton>
<IconButton color="primary"><EditIcon /></IconButton>
<IconButton color="error" size="large"><DeleteIcon /></IconButton>
<IconButton disabled><AddIcon /></IconButton>`}
      >
        <FlexBox gap={2} align="center">
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton aria-label="삭제">
              <Icon mui>DeleteIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              default
            </Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton color="primary" aria-label="편집">
              <Icon mui>EditIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              primary
            </Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton color="error" aria-label="삭제">
              <Icon mui>DeleteIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              error
            </Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton color="primary" size="small" aria-label="추가">
              <Icon mui>AddIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              small
            </Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton color="primary" size="medium" aria-label="추가">
              <Icon mui>AddIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              medium
            </Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton color="primary" size="large" aria-label="추가">
              <Icon mui>AddIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              large
            </Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <IconButton disabled aria-label="비활성">
              <Icon mui>FavoriteIcon</Icon>
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              disabled
            </Typography>
          </FlexBox>
        </FlexBox>
      </ExampleBlock>

      {/* IconButton — 실사용 예시 */}
      <ExampleBlock
        title="IconButton — 실사용 예시"
        code={`// 카드 액션 영역
<FlexBox>
  <IconButton aria-label="좋아요"><FavoriteIcon /></IconButton>
  <IconButton aria-label="공유"><ShareIcon /></IconButton>
  <IconButton aria-label="더보기"><MoreVertIcon /></IconButton>
</FlexBox>`}
      >
        <FlexBox gap={1}>
          <IconButton aria-label="좋아요">
            <Icon mui>FavoriteIcon</Icon>
          </IconButton>
          <IconButton aria-label="공유">
            <Icon mui>ShareIcon</Icon>
          </IconButton>
          <IconButton aria-label="더보기">
            <Icon mui>MoreVertIcon</Icon>
          </IconButton>
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
