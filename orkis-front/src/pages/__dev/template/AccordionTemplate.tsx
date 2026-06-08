// ============================================
// 아코디언 쇼케이스 페이지
// ============================================

import {
  Accordion,
  Icon,
  Stack,
  Typography,
} from "@/components";
import { useState } from "react";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function AccordionTemplate() {
  const [expanded, setExpanded] = useState<string | null>("panel-1");

  const handleChange = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <Stack className="ok-accordion-template" spacing={4}>
      <Typography variant="h4">Accordion</Typography>

      {/* 기본 사용 */}
      <ExampleBlock
        title="기본 아코디언"
        code={`const [expanded, setExpanded] = useState<string | null>("panel-1");

const handleChange = (id: string) => {
  setExpanded((prev) => (prev === id ? null : id));
};

<Accordion
  id="panel-1"
  title="패널 1 — 기본 사용"
  expanded={expanded === "panel-1"}
  onChange={handleChange}
>
  <Typography variant="body2">패널 내용</Typography>
</Accordion>`}
      >
        <Accordion
          id="panel-1"
          title="패널 1 — 기본 사용"
          expanded={expanded === "panel-1"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            기본 아코디언 패널입니다. 확장/축소가 가능합니다.
          </Typography>
        </Accordion>
        <Accordion
          id="panel-2"
          title="패널 2 — 두 번째 항목"
          expanded={expanded === "panel-2"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            한 번에 하나의 패널만 열리는 배타적(exclusive) 아코디언 패턴입니다.
          </Typography>
        </Accordion>
        <Accordion
          id="panel-3"
          title="패널 3 — 세 번째 항목"
          expanded={expanded === "panel-3"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            onChange 핸들러에서 id를 받아 상태를 관리합니다.
          </Typography>
        </Accordion>
      </ExampleBlock>

      {/* Outline */}
      <ExampleBlock
        title="아코디언 (Size, Outlined)"
        code={`const [expanded, setExpanded] = useState<string | null>("size-1");

const handleChange = (id: string) => {
  setExpanded((prev) => (prev === id ? null : id));
};

<Accordion
  id="size-1"
  title="패널 1 — 기본 사용"
  expanded={expanded === "size-1"}
  onChange={handleChange}
>
  <Typography variant="body2">패널 내용</Typography>
</Accordion>`}
      >
        <Accordion
          id="size-1"
          className="Accordion__sizeSmall Accordion__outlined"
          title="패널 1 — 기본 사용"
          expanded={expanded === "size-1"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            기본 아코디언 패널입니다. 확장/축소가 가능합니다.
          </Typography>
        </Accordion>
        <Accordion
          id="size-2"
          className="Accordion__sizeSmall Accordion__outlined"
          title="패널 2 — 두 번째 항목"
          expanded={expanded === "size-2"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            한 번에 하나의 패널만 열리는 배타적(exclusive) 아코디언 패턴입니다.
          </Typography>
        </Accordion>
        <Accordion
          id="size-3"
          className="Accordion__outlined Accordion__sizeSmall"
          title="패널 3 — 세 번째 항목"
          expanded={expanded === "size-3"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            onChange 핸들러에서 id를 받아 상태를 관리합니다.
          </Typography>
        </Accordion>
      </ExampleBlock>

      {/* 박스형 */}
      <ExampleBlock
        title="아코디언 (Box type)"
        code={`const [expanded, setExpanded] = useState<string | null>("box-1");

const handleChange = (id: string) => {
  setExpanded((prev) => (prev === id ? null : id));
};

<Accordion
  id="box-1"
  title="패널 1 — 기본 사용"
  expanded={expanded === "box-1"}
  onChange={handleChange}
>
  <Typography variant="body2">패널 내용</Typography>
</Accordion>`}
      >
        <Accordion
          id="box-1"
          className="Accordion__boxType"
          title="패널 1 — 기본 사용"
          expanded={expanded === "box-1"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            기본 아코디언 패널입니다. 확장/축소가 가능합니다.
          </Typography>
        </Accordion>
        <Accordion
          id="box-2"
          className="Accordion__boxType"
          title="패널 2 — 두 번째 항목"
          expanded={expanded === "box-2"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            한 번에 하나의 패널만 열리는 배타적(exclusive) 아코디언 패턴입니다.
          </Typography>
        </Accordion>
        <Accordion
          id="box-3"
          className="Accordion__boxType"
          title="패널 3 — 세 번째 항목"
          expanded={expanded === "box-3"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            onChange 핸들러에서 id를 받아 상태를 관리합니다.
          </Typography>
        </Accordion>
      </ExampleBlock>

      {/* 아이콘 포함 */}
      <ExampleBlock
        title="아이콘 포함"
        code={`<Accordion
  id="icon-1"
  title="설정"
  icon={<SettingsIcon fontSize="small" />}
  expanded={expanded === "icon-1"}
  onChange={handleChange}
>
  <Typography variant="body2">설정 패널</Typography>
</Accordion>`}
      >
        <Accordion
          id="icon-1"
          title="설정"
          icon={<Icon mui size="small">SettingsIcon</Icon>}
          expanded={expanded === "icon-1"}
          onChange={handleChange}
        >
          <Typography variant="body2">설정 패널 내용입니다.</Typography>
        </Accordion>
        <Accordion
          id="icon-2"
          title="도움말"
          icon={<Icon mui size="small">HelpIcon</Icon>}
          expanded={expanded === "icon-2"}
          onChange={handleChange}
        >
          <Typography variant="body2">도움말 패널 내용입니다.</Typography>
        </Accordion>
        <Accordion
          id="icon-3"
          title="데이터베이스"
          icon={<Icon mui size="small">StorageIcon</Icon>}
          expanded={expanded === "icon-3"}
          onChange={handleChange}
        >
          <Typography variant="body2">데이터베이스 패널 내용입니다.</Typography>
        </Accordion>
        <Accordion
          id="icon-4"
          title="정보"
          icon={<Icon mui size="small">InfoIcon</Icon>}
          expanded={expanded === "icon-4"}
          onChange={handleChange}
        >
          <Typography variant="body2">정보 패널 내용입니다.</Typography>
        </Accordion>
      </ExampleBlock>

      {/* 스타일 커스터마이징 */}
      <ExampleBlock
        title="스타일 커스터마이징"
        code={`// 테두리 있는 아코디언
<Accordion
  id="custom-1"
  title="테두리 있는 아코디언"
  disableBorder={false}
  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
  ...
/>

// 커스텀 배경색 + summarySx
<Accordion
  id="custom-2"
  title="커스텀 배경색"
  sx={{ backgroundColor: "action.hover" }}
  summarySx={{ fontWeight: 700 }}
  ...
/>`}
      >
        <Accordion
          id="custom-1"
          title="테두리 있는 아코디언"
          expanded={expanded === "custom-1"}
          onChange={handleChange}
          disableBorder={false}
        >
          <Typography variant="body2">
            disableBorder=false + sx로 테두리를 추가한 예시입니다.
          </Typography>
        </Accordion>
        <Accordion
          id="custom-2"
          title="커스텀 배경색"
          expanded={expanded === "custom-2"}
          onChange={handleChange}
        >
          <Typography variant="body2">
            summarySx, detailsSx, titleSx로 각 영역 스타일을 개별 제어합니다.
          </Typography>
        </Accordion>
      </ExampleBlock>

      {/* 비활성화 */}
      <ExampleBlock
        title="비활성화"
        code={`<Accordion
  id="disabled-1"
  title="비활성화된 아코디언"
  expanded={false}
  onChange={handleChange}
  disabled
>
  <Typography variant="body2">이 내용은 보이지 않습니다.</Typography>
</Accordion>`}
      >
        <Accordion
          id="disabled-1"
          title="비활성화된 아코디언"
          expanded={false}
          onChange={handleChange}
          disabled
        >
          <Typography variant="body2">이 내용은 보이지 않습니다.</Typography>
        </Accordion>
      </ExampleBlock>
    </Stack>
  );
}
