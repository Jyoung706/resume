// ============================================
// LLMModelCard — 개별 LLM 모델 카드
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  ActionMenu,
  Box,
  Chip,
  Divider,
  IconButton,
  Img,
  Paper,
  Typography,
  FlexBox,
  StarIcon,
  StarBorderIcon,
  EditIcon,
  DeleteIcon
} from "@/components";
import type { LLMModelResponse } from "@/logic/common/llm/types/llmModel";

// ============================================
// Props
// ============================================

export interface LLMModelCardProps {
  model: LLMModelResponse;
  onEdit: (model: LLMModelResponse) => void;
  onDelete: (modelId: string) => void;
  onSetDefault: (modelId: string) => void;
}

// ============================================
// 프로바이더 로고 매핑
// ============================================

const PROVIDER_LOGOS: Record<string, string> = {
  openai: "/assets/llm-icon/openai.png",
  anthropic: "/assets/llm-icon/anthropic.ico",
  google: "/assets/llm-icon/google.ico",
  meta: "/assets/llm-icon/meta.png",
  cohere: "/assets/llm-icon/cohere.ico",
  "mistral-ai": "/assets/llm-icon/mistral-ai.ico",
};

const DEFAULT_LOGO = "/assets/llm-icon/openai.png";

function getProviderLogo(provider: string) {
  return PROVIDER_LOGOS[provider.toLowerCase()] || DEFAULT_LOGO;
}

// ============================================
// 연결 상태 라벨/색상
// ============================================

const STATUS_MAP: Record<string, { label: string; color: "success" | "error" | "default" }> = {
  connected: { label: "정상", color: "success" },
  disconnected: { label: "비정상", color: "error" },
  unknown: { label: "미확인", color: "default" },
};

function getStatusInfo(status: string | undefined) {
  return STATUS_MAP[status ?? "unknown"] ?? STATUS_MAP.unknown;
}

// ============================================
// LLMModelCard
// ============================================

export function LLMModelCard({ model, onEdit, onDelete, onSetDefault }: LLMModelCardProps) {
  const statusInfo = getStatusInfo(model.connectionStatus);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = DEFAULT_LOGO;
  };

  return (
    <Paper variant="outlined" className="LLMModelCard">
      <FlexBox direction="column" className="LLMModelCard__content">
        {/* ── 헤더: 로고 + 이름/상태 + 버튼 ── */}
        <FlexBox align="flex-start" className="LLMModelCard__header">
          {/* Provider 로고 */}
          <Box className="LLMModelCard__logo-wrap">
            <Img
              src={getProviderLogo(model.provider)}
              alt={model.provider}
              onError={handleImageError}
              fit="contain"
              className="LLMModelCard__logo"
            />
          </Box>

          {/* 이름 + 상태 */}
          <FlexBox direction="column" className="LLMModelCard__info">
            <FlexBox align="center" className="LLMModelCard__name-row">
              <Typography className="LLMModelCard__name">
                {model.displayName || model.modelName}
              </Typography>
              {model.isDefault && (
                <Chip
                  label="기본"
                  size="xsmall"
                  color="primary"
                  variant="filled"
                  className="LLMModelCard__default-chip"
                />
              )}
            </FlexBox>

            <Chip
              label={statusInfo.label}
              size="xsmall"
              color={statusInfo.color}
              variant="outlined"
              className="LLMModelCard__status-chip"
            />
          </FlexBox>

          {/* 기본 모델 + 메뉴 버튼 */}
          <FlexBox align="center" className="LLMModelCard__actions">
            <IconButton
              size="small"
              onClick={() => onSetDefault(model.id)}
              className="LLMModelCard__star-btn"
              title={model.isDefault ? "기본 모델" : "기본 모델로 설정"}
            >
              {model.isDefault ? <StarIcon fontSize="small" className="LLMModelCard__star-btn-selected" /> : <StarBorderIcon fontSize="small" className="LLMModelCard__star-btn" />}
            </IconButton>

            <ActionMenu
              items={[
                { label: "수정", icon: <EditIcon fontSize="small" />, onClick: () => onEdit(model) },
                { label: "삭제", icon: <DeleteIcon fontSize="small" />, onClick: () => onDelete(model.id), danger: true },
              ]}
              zIndex="calc(var(--mui-zIndex-modal, 1300) + 2)"
              stopPropagation
              menuProps={{
                disableRestoreFocus: true,
                transformOrigin: { horizontal: "right", vertical: "top" },
                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                slotProps: { paper: { className: "LLMModelCard__menu-paper" } },
              }}
            />
          </FlexBox>
        </FlexBox>

        {/* ── 상세 정보 테이블 ── */}
        <Divider />
        <Box className="LLMModelCard__details">
          <FlexBox className="LLMModelCard__detail-row">
            <Typography className="LLMModelCard__detail-label">모델명</Typography>
            <Typography className="LLMModelCard__detail-value">{model.modelName}</Typography>
          </FlexBox>

          {model.apiKeyMasked && (
            <FlexBox className="LLMModelCard__detail-row">
              <Typography className="LLMModelCard__detail-label">API KEY</Typography>
              <Typography className="LLMModelCard__detail-value LLMModelCard__detail-value--mono">
                {model.apiKeyMasked}
              </Typography>
            </FlexBox>
          )}

          {model.lastTestedAt && (
            <FlexBox className="LLMModelCard__detail-row">
              <Typography className="LLMModelCard__detail-label">마지막 테스트</Typography>
              <Typography className="LLMModelCard__detail-value">
                {new Date(model.lastTestedAt).toLocaleString("ko-KR")}
              </Typography>
            </FlexBox>
          )}
        </Box>
      </FlexBox>
    </Paper>
  );
}
