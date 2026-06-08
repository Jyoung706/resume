// ============================================
// Domain 컴포넌트 쇼케이스 (PricingCard, ContactBar)
// ============================================

import {
  Box,
  FlexBox,
  Icon,
  Stack,
  Typography,
} from "@/components";
import {
  ContactBar,
  PricingCard,
  type ContactItem,
  type PricingFeature,
} from "@/pages/auth/userType/parts";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const FREE_FEATURES: PricingFeature[] = [
  { text: "기본 기능 무제한" },
  { text: "5GB 저장 공간" },
  { text: "이메일 지원" },
  { text: "커뮤니티 포럼" }
];

const PRO_FEATURES: PricingFeature[] = [
  { text: "모든 Free 기능 포함", required: true },
  { text: "100GB 저장 공간" },
  { text: "우선 지원" },
  { text: "API 액세스" },
  { text: "팀 협업 도구" }
];

const ENTERPRISE_FEATURES: PricingFeature[] = [
  { text: "모든 Pro 기능 포함", required: true },
  { text: "무제한 저장 공간" },
  { text: "전담 매니저" },
  { text: "SLA 보장" },
  { text: "맞춤 개발 지원" },
  { text: "보안 감사 보고서" }
];

const CONTACT_ITEMS: ContactItem[] = [
  { icon: <Icon mui size="small">EmailIcon</Icon>, label: "info@orkis.io" },
  { icon: <Icon mui size="small">PhoneIcon</Icon>, label: "02-1234-5678" },
  { icon: <Icon mui size="small">LocationOnIcon</Icon>, label: "서울시 강남구" }
];

export function DomainTemplate() {
  return (
    <Stack className="ok-domain-template" spacing={4}>
      <Typography variant="h4">Domain Components</Typography>

      {/* PricingCard */}
      <ExampleBlock
        title="PricingCard — 요금제 카드"
        code={`<PricingCard
  userType="Pro"
  price="₩29,000/월"
  description="성장하는 팀에 적합"
  cta="시작하기"
  ctaVariant="free"
  features={[
    { text: "모든 Free 기능 포함", required: true },
    { text: "100GB 저장 공간" },
    { text: "API 액세스" },
  ]}
  onCtaClick={() => alert("Pro 선택!")}
/>`}
      >
        <FlexBox
          gap={3}
          wrap="wrap"
          justify="center"
          bgcolor="var(--grey-100)"
          py={4}
          px={2}
          borderRadius={2}
        >
          <PricingCard
            userType="Free"
            price="₩0/월"
            description="개인 사용자에 적합"
            cta="무료 시작"
            ctaVariant="free"
            features={FREE_FEATURES}
            onCtaClick={() => alert("Free 선택!")}
          />
          <PricingCard
            userType="Pro"
            price="₩29,000/월"
            description="성장하는 팀에 적합"
            cta="시작하기"
            ctaVariant="admin"
            features={PRO_FEATURES}
            onCtaClick={() => alert("Pro 선택!")}
          />
          <PricingCard
            userType="Enterprise"
            price="맞춤 견적"
            description="대규모 조직을 위한 플랜"
            contactLabel="영업팀 문의"
            features={ENTERPRISE_FEATURES}
            onContactClick={() => alert("영업팀 연결!")}
          />
        </FlexBox>
      </ExampleBlock>

      {/* ContactBar */}
      <ExampleBlock
        title="ContactBar — 연락처 바"
        code={`<ContactBar
  items={[
    { icon: <EmailIcon />, label: "info@orkis.io" },
    { icon: <PhoneIcon />, label: "02-1234-5678" },
    { icon: <LocationOnIcon />, label: "서울시 강남구" },
  ]}
/>`}
      >
        <Stack spacing={3}>
          <ContactBar items={CONTACT_ITEMS} />
          <ContactBar
            items={[
              {
                icon: <Icon mui size="small">EmailIcon</Icon>,
                label: "support@orkis.io"
              },
              { icon: <Icon mui size="small">PhoneIcon</Icon>, label: "1588-0000" }
            ]}
          />
        </Stack>
      </ExampleBlock>

      {/* Combined Example */}
      <ExampleBlock
        title="조합 예제 — 요금 페이지 미리보기"
        code={`<FlexBox gap={3}>
  <PricingCard ... />
  <PricingCard ... />
</FlexBox>
<ContactBar items={...} />`}
      >
        <Stack spacing={4} alignItems="center">
          <FlexBox gap={3} wrap="wrap" justify="center">
            <PricingCard
              userType="Free"
              price="₩0/월"
              description="개인 사용자에 적합"
              cta="무료 시작"
              ctaVariant="free"
              features={FREE_FEATURES}
            />
            <PricingCard
              userType="Pro"
              price="₩29,000/월"
              description="성장하는 팀에 적합"
              cta="시작하기"
              ctaVariant="admin"
              features={PRO_FEATURES}
            />
          </FlexBox>
          <Box mt={2}>
            <ContactBar items={CONTACT_ITEMS} />
          </Box>
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
