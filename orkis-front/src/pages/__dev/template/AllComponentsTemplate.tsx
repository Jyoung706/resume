// ============================================
// 전체 컴포넌트 한눈에 보기 — 각 템플릿에서 핵심 섹션만 선별
// ============================================

import { Dialog } from "@/components/base/Dialog";
import {
  Accordion,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FlexBox,
  Form,
  FormControl,
  FormControlLabel,
  FormField,
  IconButton,
  Input,
  InputLabel,
  Link,
  MenuItem,
  Modal,
  Radio,
  RadioButtonGroup,
  RadioGroup,
  Select,
  Snackbar,
  Stack,
  Typography,
  useToast,
  Icon,
} from "@/components";
import { useState } from "react";
import { ExampleBlock } from "./parts";
import "./Template.scss";

// ── 상수 ──
const BUTTON_COLORS = [
  "primary",
  "secondary",
  "error",
  "warning",
  "info",
  "success"
] as const;
const BUTTON_VARIANTS = ["contained", "outlined", "text"] as const;
const CHIP_COLORS = [
  "default",
  "primary",
  "secondary",
  "success",
  "error",
  "info",
  "warning"
] as const;
const ALERT_SEVERITIES = ["success", "info", "warning", "error"] as const;
const MODAL_SIZES = ["xsmall", "small", "medium", "large", "xlarge"] as const;
const TYPO_VARIANTS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "subtitle1",
  "subtitle2",
  "body1",
  "body2",
  "caption",
  "overline"
] as const;

export function AllComponentsTemplate() {
  // Select
  const [age, setAge] = useState("");
  // Modal
  const [openSize, setOpenSize] = useState<string | null>(null);
  // Dialog
  const [basicDialogOpen, setBasicDialogOpen] = useState(false);
  // Snackbar
  const [basicSnackOpen, setBasicSnackOpen] = useState(false);
  // Accordion
  const [expanded, setExpanded] = useState<string | null>("panel-1");
  // Form
  const [submitted, setSubmitted] = useState("");
  // Toast
  const { showToast } = useToast();

  const handleAccordionChange = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <Stack className="ok-all-components-template" spacing={6}>
      <Typography variant="h4">All Components</Typography>

      {/* ─── Button: Variants & Colors ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Button</Typography>
        <ExampleBlock
          title="Variants & Colors"
          code={`<Button variant="contained" color="primary">primary</Button>
<Button variant="outlined" color="error">error</Button>
<Button variant="text" color="success">success</Button>`}
        >
          <Stack spacing={2}>
            {BUTTON_VARIANTS.map((variant) => (
              <FlexBox key={variant} gap={1} wrap="wrap" align="center">
                <Typography variant="body2" width={80}>
                  {variant}
                </Typography>
                {BUTTON_COLORS.map((color) => (
                  <Button key={color} variant={variant} color={color}>
                    {color}
                  </Button>
                ))}
              </FlexBox>
            ))}
          </Stack>
        </ExampleBlock>

        <ExampleBlock
          title="IconButton"
          code={`<IconButton aria-label="삭제"><DeleteIcon /></IconButton>
<IconButton color="primary"><EditIcon /></IconButton>
<IconButton color="error" size="large"><DeleteIcon /></IconButton>
<IconButton disabled><AddIcon /></IconButton>`}
        >
          <FlexBox gap={2} align="center">
            {[
              { icon: <Icon mui>DeleteIcon</Icon>, label: "default", props: {} },
              {
                icon: <Icon mui>EditIcon</Icon>,
                label: "primary",
                props: { color: "primary" as const }
              },
              {
                icon: <Icon mui>DeleteIcon</Icon>,
                label: "error",
                props: { color: "error" as const }
              },
              {
                icon: <Icon mui size="small">AddIcon</Icon>,
                label: "small",
                props: { color: "primary" as const, size: "small" as const }
              },
              {
                icon: <Icon mui>AddIcon</Icon>,
                label: "large",
                props: { color: "primary" as const, size: "large" as const }
              },
              {
                icon: <Icon mui>FavoriteIcon</Icon>,
                label: "disabled",
                props: { disabled: true }
              }
            ].map(({ icon, label, props }) => (
              <FlexBox key={label} direction="column" align="center" gap={0.5}>
                <IconButton aria-label={label} {...props}>
                  {icon}
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </FlexBox>
            ))}
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Input: States ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Input</Typography>
        <ExampleBlock
          title="States"
          code={`<Input label="Disabled" disabled />
<Input label="Error" error helperText="오류 메시지" />
<Input label="Required" required />
<Input label="Read Only" slotProps={{ input: { readOnly: true } }} defaultValue="읽기 전용" />`}
        >
          <FlexBox gap={2} wrap="wrap">
            <Input label="Disabled" disabled />
            <Input label="Error" error helperText="오류 메시지" />
            <Input label="Required" required />
            <Input
              label="Read Only"
              slotProps={{ input: { readOnly: true } }}
              defaultValue="읽기 전용"
            />
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Typography: MUI Variants, Divider, Link ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Typography</Typography>
        <ExampleBlock
          title="MUI Variants"
          code={`<Typography variant="h1">h1</Typography>
<Typography variant="body1">body1</Typography>
<Typography variant="caption">caption</Typography>`}
        >
          <Stack spacing={1} divider={<Divider />}>
            {TYPO_VARIANTS.map((v) => (
              <Typography key={v} variant={v}>
                {v} — The quick brown fox jumps over the lazy dog
              </Typography>
            ))}
          </Stack>
        </ExampleBlock>

        <ExampleBlock
          title="Divider"
          code={`<Divider />
<Divider textAlign="center">OR</Divider>
<Divider variant="middle" />`}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" mb={1}>
                기본
              </Typography>
              <Divider />
            </Box>
            <Box>
              <Typography variant="body2" mb={1}>
                텍스트 포함
              </Typography>
              <Divider>OR</Divider>
            </Box>
            <Box>
              <Typography variant="body2" mb={1}>
                textAlign="left"
              </Typography>
              <Divider textAlign="left">섹션</Divider>
            </Box>
            <Box>
              <Typography variant="body2" mb={1}>
                variant="middle"
              </Typography>
              <Divider variant="middle" />
            </Box>
            <Box>
              <Typography variant="body2" mb={1}>
                세로 구분선 (orientation="vertical")
              </Typography>
              <FlexBox gap={2} align="center">
                <Typography>항목 A</Typography>
                <Divider orientation="vertical" flexItem />
                <Typography>항목 B</Typography>
                <Divider orientation="vertical" flexItem />
                <Typography>항목 C</Typography>
              </FlexBox>
            </Box>
          </Stack>
        </ExampleBlock>

        <ExampleBlock
          title="Link"
          code={`<Link href="#">기본 링크</Link>
<Link href="#" underline="hover">Hover 밑줄</Link>
<Link href="#" underline="none">밑줄 없음</Link>
<Link href="#" color="secondary">Secondary 색상</Link>`}
        >
          <FlexBox gap={3} wrap="wrap" align="center">
            <Link href="#" onClick={(e) => e.preventDefault()}>
              기본 링크
            </Link>
            <Link
              href="#"
              underline="hover"
              onClick={(e) => e.preventDefault()}
            >
              Hover 밑줄
            </Link>
            <Link href="#" underline="none" onClick={(e) => e.preventDefault()}>
              밑줄 없음
            </Link>
            <Link
              href="#"
              color="secondary"
              onClick={(e) => e.preventDefault()}
            >
              Secondary
            </Link>
            <Link href="#" color="error" onClick={(e) => e.preventDefault()}>
              Error
            </Link>
            <Link
              href="#"
              color="text.secondary"
              fontSize="0.875rem"
              onClick={(e) => e.preventDefault()}
            >
              text.secondary (0.875rem)
            </Link>
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Checkbox: Basic ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Checkbox & FormControlLabel</Typography>
        <ExampleBlock
          title="Basic Checkbox"
          code={`<Checkbox />
<Checkbox defaultChecked />
<Checkbox disabled />
<Checkbox disabled checked />`}
        >
          <FlexBox gap={1} align="center">
            <Checkbox />
            <Checkbox defaultChecked />
            <Checkbox disabled />
            <Checkbox disabled checked />
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Radio: Basic ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Radio & RadioGroup</Typography>
        <ExampleBlock
          title="Basic Radio"
          code={`<RadioGroup row defaultValue="a">
  <FormControlLabel value="a" control={<Radio />} label="옵션 A" />
  <FormControlLabel value="b" control={<Radio />} label="옵션 B" />
  <FormControlLabel value="c" control={<Radio />} label="옵션 C" />
</RadioGroup>`}
        >
          <RadioGroup row defaultValue="a">
            <FormControlLabel value="a" control={<Radio />} label="옵션 A" />
            <FormControlLabel value="b" control={<Radio />} label="옵션 B" />
            <FormControlLabel value="c" control={<Radio />} label="옵션 C" />
          </RadioGroup>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── RadioButtonGroup (UI): options 기반 간편 생성 ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">RadioButtonGroup (UI)</Typography>
        <ExampleBlock
          title="options 배열로 간편 생성"
          code={`<RadioButtonGroup
  label="과일 선택"
  row
  options={[
    { label: "사과", value: "apple" },
    { label: "바나나", value: "banana" },
    { label: "포도", value: "grape" },
  ]}
  defaultValue="apple"
/>`}
        >
          <RadioButtonGroup
            label="과일 선택"
            row
            options={[
              { label: "사과", value: "apple" },
              { label: "바나나", value: "banana" },
              { label: "포도", value: "grape" },
            ]}
            defaultValue="apple"
          />
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Select: Basic ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Select & MenuItem</Typography>
        <ExampleBlock
          title="Basic Select"
          code={`<FormControl fullWidth>
  <InputLabel>나이</InputLabel>
  <Select value={age} label="나이" onChange={(e) => setAge(e.target.value as string)}>
    <MenuItem value={10}>10대</MenuItem>
    <MenuItem value={20}>20대</MenuItem>
    <MenuItem value={30}>30대</MenuItem>
  </Select>
</FormControl>`}
        >
          <FlexBox gap={3} wrap="wrap" align="flex-start">
            <FormControl style={{ minWidth: 200 }}>
              <InputLabel>나이</InputLabel>
              <Select
                value={age}
                label="나이"
                onChange={(e) => setAge(e.target.value as string)}
              >
                <MenuItem value="">
                  <em>선택 없음</em>
                </MenuItem>
                <MenuItem value={10}>10대</MenuItem>
                <MenuItem value={20}>20대</MenuItem>
                <MenuItem value={30}>30대</MenuItem>
              </Select>
            </FormControl>
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Chip: Basic, Colors (Filled), Colors (Outlined) ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Chip</Typography>
        <ExampleBlock
          title="Basic"
          code={`<Chip label="Default" />
<Chip label="Outlined" variant="outlined" />`}
        >
          <FlexBox gap={1} wrap="wrap">
            <Chip label="Default" />
            <Chip label="Outlined" variant="outlined" />
          </FlexBox>
        </ExampleBlock>

        <ExampleBlock
          title="Colors (Filled)"
          code={`<Chip label="primary" color="primary" />
<Chip label="secondary" color="secondary" />
<Chip label="success" color="success" />`}
        >
          <FlexBox gap={1} wrap="wrap">
            {CHIP_COLORS.map((color) => (
              <Chip key={color} label={color} color={color} />
            ))}
          </FlexBox>
        </ExampleBlock>

        <ExampleBlock
          title="Colors (Outlined)"
          code={`<Chip label="primary" color="primary" variant="outlined" />
<Chip label="secondary" color="secondary" variant="outlined" />`}
        >
          <FlexBox gap={1} wrap="wrap">
            {CHIP_COLORS.map((color) => (
              <Chip
                key={color}
                label={color}
                color={color}
                variant="outlined"
              />
            ))}
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Form: 기본 submit ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Form & InputAdornment</Typography>
        <ExampleBlock
          title="Form — 기본 submit"
          code={`<Form onSubmit={() => alert("submitted!")}>
  <Stack spacing={2}>
    <Input label="이름" />
    <Input label="이메일" type="email" />
    <Button type="submit" variant="contained">제출</Button>
  </Stack>
</Form>`}
        >
          <Box maxWidth={400}>
            <Form
              onSubmit={() =>
                setSubmitted(
                  "제출됨! (" + new Date().toLocaleTimeString() + ")"
                )
              }
            >
              <Stack spacing={2}>
                <Input label="이름" />
                <Input label="이메일" type="email" />
                <FlexBox gap={2} align="center">
                  <Button type="submit" variant="contained">
                    제출
                  </Button>
                  {submitted && (
                    <Typography variant="body2" color="success.main">
                      {submitted}
                    </Typography>
                  )}
                </FlexBox>
              </Stack>
            </Form>
          </Box>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── FormField: Basic ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">FormField</Typography>
        <ExampleBlock
          title="Basic"
          code={`<FormField label="이름">
  <Input placeholder="이름을 입력하세요" fullWidth />
</FormField>`}
        >
          <Stack spacing={1.5} maxWidth="37.5rem">
            <FormField label="이름">
              <Input placeholder="이름을 입력하세요" fullWidth />
            </FormField>
          </Stack>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Alert: Standard, Filled, Toast ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Alert</Typography>
        <ExampleBlock
          title="Standard"
          code={`<Alert severity="success" variant="standard">success</Alert>
<Alert severity="info" variant="standard">info</Alert>
<Alert severity="warning" variant="standard">warning</Alert>
<Alert severity="error" variant="standard">error</Alert>`}
        >
          <Stack spacing={1.5}>
            {ALERT_SEVERITIES.map((severity) => (
              <Alert key={severity} severity={severity} variant="standard">
                {severity} — standard alert 메시지입니다.
              </Alert>
            ))}
          </Stack>
        </ExampleBlock>

        <ExampleBlock
          title="Filled"
          code={`<Alert severity="success" variant="filled">success</Alert>
<Alert severity="info" variant="filled">info</Alert>
<Alert severity="warning" variant="filled">warning</Alert>
<Alert severity="error" variant="filled">error</Alert>`}
        >
          <Stack spacing={1.5}>
            {ALERT_SEVERITIES.map((severity) => (
              <Alert key={severity} severity={severity} variant="filled">
                {severity} — filled alert 메시지입니다.
              </Alert>
            ))}
          </Stack>
        </ExampleBlock>

        <ExampleBlock
          title="Toast"
          code={`const { showToast } = useToast();

<Button onClick={() => showToast("메시지", "success")}>
  success Toast
</Button>`}
        >
          <FlexBox gap={2} wrap="wrap">
            {ALERT_SEVERITIES.map((severity) => (
              <Button
                key={severity}
                variant="outlined"
                onClick={() =>
                  showToast(`${severity} 토스트 메시지입니다.`, severity)
                }
              >
                {severity} Toast
              </Button>
            ))}
          </FlexBox>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Modal: Sizes ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Modal & ConfirmModal</Typography>
        <ExampleBlock
          title="Modal Sizes"
          code={`<Modal open={open} onClose={handleClose} title="Medium Modal" size="medium"
  actions={<><Button onClick={handleClose}>취소</Button><Button variant="contained" onClick={handleClose}>확인</Button></>}
>
  <Typography>모달 내용</Typography>
</Modal>`}
        >
          <FlexBox gap={2} wrap="wrap">
            {MODAL_SIZES.map((size) => (
              <Button
                key={size}
                variant="outlined"
                onClick={() => setOpenSize(size)}
              >
                {size.toUpperCase()} Modal
              </Button>
            ))}
          </FlexBox>

          {MODAL_SIZES.map((size) => (
            <Modal
              key={size}
              open={openSize === size}
              onClose={() => setOpenSize(null)}
              title={`${size.toUpperCase()} Modal`}
              size={size}
              actions={
                <>
                  <Button onClick={() => setOpenSize(null)}>취소</Button>
                  <Button variant="contained" onClick={() => setOpenSize(null)}>
                    확인
                  </Button>
                </>
              }
            >
              <Typography>
                이것은 {size.toUpperCase()} 크기의 모달입니다. 모달 컴포넌트는
                xsmall, small, medium, large, xlarge 프리셋 크기를 지원합니다.
              </Typography>
            </Modal>
          ))}
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Dialog: Basic ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Dialog</Typography>
        <ExampleBlock
          title="Basic Dialog"
          code={`<Dialog open={open} onClose={() => setOpen(false)}>
  <DialogTitle>제목</DialogTitle>
  <DialogContent><Typography>내용</Typography></DialogContent>
  <DialogActions>
    <Button onClick={() => setOpen(false)}>취소</Button>
    <Button variant="contained" onClick={() => setOpen(false)}>확인</Button>
  </DialogActions>
</Dialog>`}
        >
          <Button variant="outlined" onClick={() => setBasicDialogOpen(true)}>
            기본 Dialog 열기
          </Button>

          <Dialog
            open={basicDialogOpen}
            onClose={() => setBasicDialogOpen(false)}
          >
            <DialogTitle>알림</DialogTitle>
            <DialogContent>
              <Typography>
                이것은 기본 Dialog 예시입니다. DialogTitle, DialogContent,
                DialogActions 를 조합하여 사용합니다.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBasicDialogOpen(false)}>취소</Button>
              <Button
                variant="contained"
                onClick={() => setBasicDialogOpen(false)}
              >
                확인
              </Button>
            </DialogActions>
          </Dialog>
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Snackbar: Basic ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Snackbar</Typography>
        <ExampleBlock
          title="Basic Snackbar"
          code={`<Snackbar
  open={open}
  onClose={() => setOpen(false)}
  message="기본 스낵바 메시지입니다."
/>`}
        >
          <Button variant="contained" onClick={() => setBasicSnackOpen(true)}>
            기본 스낵바 열기
          </Button>
          <Snackbar
            open={basicSnackOpen}
            onClose={() => setBasicSnackOpen(false)}
            message="기본 스낵바 메시지입니다."
            autoHideDuration={3000}
          />
        </ExampleBlock>
      </Stack>

      <Divider />

      {/* ─── Accordion: 기본 ─── */}
      <Stack spacing={4}>
        <Typography variant="h5">Accordion</Typography>
        <ExampleBlock
          title="기본 아코디언"
          code={`const [expanded, setExpanded] = useState<string | null>("panel-1");

const handleChange = (id: string) => {
  setExpanded((prev) => (prev === id ? null : id));
};

<Accordion id="panel-1" title="패널 1" expanded={expanded === "panel-1"} onChange={handleChange}>
  <Typography variant="body2">패널 내용</Typography>
</Accordion>`}
        >
          <Accordion
            id="panel-1"
            title="패널 1 — 기본 사용"
            expanded={expanded === "panel-1"}
            onChange={handleAccordionChange}
          >
            <Typography variant="body2">
              기본 아코디언 패널입니다. 확장/축소가 가능합니다.
            </Typography>
          </Accordion>
          <Accordion
            id="panel-2"
            title="패널 2 — 두 번째 항목"
            expanded={expanded === "panel-2"}
            onChange={handleAccordionChange}
          >
            <Typography variant="body2">
              한 번에 하나의 패널만 열리는 배타적(exclusive) 아코디언
              패턴입니다.
            </Typography>
          </Accordion>
          <Accordion
            id="panel-3"
            title="패널 3 — 세 번째 항목"
            expanded={expanded === "panel-3"}
            onChange={handleAccordionChange}
          >
            <Typography variant="body2">
              onChange 핸들러에서 id를 받아 상태를 관리합니다.
            </Typography>
          </Accordion>
        </ExampleBlock>
      </Stack>
    </Stack>
  );
}
