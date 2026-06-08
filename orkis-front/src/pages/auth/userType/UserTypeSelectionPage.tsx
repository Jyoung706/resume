// ============================================
// 사용 형태 선택 페이지 — props 기반 Design 컴포넌트
// Design Layer: props만 받아서 렌더링 (로직 없음)
// ============================================

import {
  Box,
  Button,
  CloseIcon,
  // EmailIcon,
  EmailOutlinedIcon,
  FlexBox,
  HelpCenterOutlinedIcon,
  IconButton,
  Modal,
  // PhoneIcon,
  // QuestionMarkIcon,
  Stack,
  SupportAgentOutlinedIcon,
  Typography
} from "@/components";
import {
  ContactBar,
  type ContactItem,
  PricingCard,
  type PricingFeature
} from "./parts";
import "./UserTypeSelectionPage.scss";

// ============================================
// 연락처 데이터
// ============================================
const CONTACT_ITEMS: ContactItem[] = [
  {
    icon: <HelpCenterOutlinedIcon className="UserTypePage__contact-icon" />,
    label: "FAQ"
  },
  {
    icon: <EmailOutlinedIcon className="UserTypePage__contact-icon" />,
    label: "orkis-admin@bi-cns.com"
  },
  {
    icon: <SupportAgentOutlinedIcon className="UserTypePage__contact-icon" />,
    label: "02-6952-8164"
  }
];

// ============================================
// 요금제 데이터
// ============================================
interface PlanConfig {
  id: string;
  userType: string;
  price: string;
  description: string;
  cta?: string;
  ctaVariant?: "free" | "admin";
  contactLabel?: string;
  features: PricingFeature[];
}

const PLANS: PlanConfig[] = [
  {
    id: "free",
    userType: "일반 사용자",
    price: "Free",
    description: "접속할 데이터베이스를 모르거나 없는 사용자",
    cta: "바로 확인하세요",
    ctaVariant: "free",
    features: [
      { text: "매일 무료 질문 50건 무료 지급" },
      { text: "SQL 생성 가능" },
      { text: "DB 스키마를 추가하여 정확한 답변을 얻으세요" },
      { text: "키워드를 추가하여 결과에 정확성을 더하세요" },
      { text: "추가 기능을 오른쪽패널에서 한눈에 관리하세요" }
    ]
  },
  {
    id: "pro",
    userType: "기업 사용자",
    price: "문의",
    description: "기업 시스템 사용자로 사용자 라인센스 등록이 필요",
    contactLabel: "영업팀 문의",
    features: [
      { text: "기업 사용자용 라이센스 등록이 필요합니다", required: true },
      { text: "질문갯수 무제한 지급" },
      { text: "팀과 함께 SQL 작업을 진행하세요" },
      { text: "키워드를 추가하여 결과에 정확성을 더하세요" },
      { text: "전용 화면에서 더 편리한 사용자경험을 얻으세요 ( 프로모드 )" }
    ]
  },
  {
    id: "admin",
    userType: "기업 관리자",
    price: "Custom",
    description: "기업 시스템 관리자로 관리자 라인센스 등록이 필요",
    contactLabel: "영업팀 문의",
    features: [
      { text: "기업 관리자용 라이센스 등록이 필요합니다", required: true },
      { text: "기업 사용자 관리기능 제공" },
      { text: "팀과 함께 SQL 작업을 진행하세요" },
      { text: "SQL 생성, 수정 가능" },
      { text: "DB 스키마를 추가하여 정확한 답변을 얻으세요" },
      { text: "전용 화면에서 더 편리한 사용자경험을 얻으세요 ( 프로모드 )" }
    ]
  }
];

// ============================================
// Props 인터페이스
// ============================================
export interface UserTypeSelectionPageProps {
  onSelectPlan: (planId: string) => void;
  onClose: () => void;
  contactModalOpen: boolean;
  onContactModalClose: () => void;
}

// ============================================
// UserTypeSelectionPage (Design Only — props 기반)
// ============================================
export function UserTypeSelectionPage({
  onSelectPlan,
  onClose,
  contactModalOpen,
  onContactModalClose
}: UserTypeSelectionPageProps) {
  return (
    <Stack className="UserTypePage__root">
      {/* 닫기 버튼 (우상단) */}
      <FlexBox className="UserTypePage__close-btn">
        <IconButton aria-label="닫기" onClick={onClose}>
          <CloseIcon />
          {/* <Icon>chevron_right</Icon> */}
        </IconButton>
      </FlexBox>

      {/* 타이틀 */}
      <Typography className="UserTypePage__title" variant="h4">
        사용 형태를 선택해주세요
      </Typography>

      {/* 연락처 바 */}
      <ContactBar className="UserTypePage__contact" items={CONTACT_ITEMS} />

      {/* 요금제 카드 3열 */}
      <FlexBox className="UserTypePage__plans">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            userType={plan.userType}
            price={plan.price}
            description={plan.description}
            cta={plan.cta}
            ctaVariant={plan.ctaVariant}
            contactLabel={plan.contactLabel}
            features={plan.features}
            onCtaClick={() => onSelectPlan(plan.id)}
            onContactClick={() => onSelectPlan(plan.id)}
          />
        ))}
      </FlexBox>

      {/* 영업팀 문의 안내 모달 (pro/admin 선택 시) */}
      <Modal
        open={contactModalOpen}
        onClose={onContactModalClose}
        title="영업팀 문의가 필요합니다"
        size="medium"
        actions={
          <Button variant="contained" onClick={onContactModalClose}>
            확인
          </Button>
        }
      >
        <Box className="UserTypePage__contact-modal-body">
          <Typography variant="body1">
            기업 사용자 / 기업 관리자 라이선스는 영업팀과의 협의 후 발급됩니다.
          </Typography>
          <Typography variant="body1">
            아래 연락처로 문의 부탁드립니다.
          </Typography>
          <FlexBox className="UserTypePage__contact-modal-item">
            <EmailOutlinedIcon className="UserTypePage__contact-modal-icon" />
            <Typography variant="body1">orkis-admin@bi-cns.com</Typography>
          </FlexBox>
          <FlexBox className="UserTypePage__contact-modal-item">
            <SupportAgentOutlinedIcon className="UserTypePage__contact-modal-icon" />
            <Typography variant="body1">02-6952-8164</Typography>
          </FlexBox>
        </Box>
      </Modal>
    </Stack>
  );
}
