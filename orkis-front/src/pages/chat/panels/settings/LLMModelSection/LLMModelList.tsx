// ============================================
// LLMModelList — LLM 모델 카드 목록
// Design Layer: props 기반 (로직 없음)
// ============================================

import { Button, FlexBox, Icon, Typography } from "@/components";
import type { LLMModelResponse } from "@/logic/common/llm/types/llmModel";
import { LLMModelCard } from "./LLMModelCard";

// ============================================
// Props
// ============================================

export interface LLMModelListProps {
  /** 모델 목록 */
  models: LLMModelResponse[];
  /** 기본 모델 */
  defaultModel?: LLMModelResponse | null;
  /** 추가 버튼 클릭 */
  onAddClick?: () => void;
  /** 수정 클릭 */
  onEditClick?: (model: LLMModelResponse) => void;
  /** 삭제 클릭 */
  onDeleteClick?: (modelId: string) => void;
  /** 기본 모델 설정 */
  onSetDefault?: (modelId: string) => void;
}

// ============================================
// LLMModelList
// ============================================

export function LLMModelList({
  models,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onSetDefault,
}: LLMModelListProps) {
  // 모델 없을 때
  if (models.length === 0) {
    return (
      <FlexBox direction="column" align="center" className="LLMModelList LLMModelList--empty">
        <Typography className="Panel__placeholder-text">
          등록된 언어모델이 없습니다
        </Typography>
        {onAddClick && (
          <Button
            variant="outlined"
            size="small"
            onClick={onAddClick}
            className="LLMModelList__add-btn"
          >
            <Icon mui size="small">AddIcon</Icon>
            언어모델 추가
          </Button>
        )}
      </FlexBox>
    );
  }

  return (
    <FlexBox direction="column" className="LLMModelList">
      {models.map((model) => (
        <LLMModelCard
          key={model.id}
          model={model}
          onEdit={onEditClick ?? (() => {})}
          onDelete={onDeleteClick ?? (() => {})}
          onSetDefault={onSetDefault ?? (() => {})}
        />
      ))}

      {/* 하단 추가 버튼 */}
      {onAddClick && (
        <FlexBox justify="center" className="LLMModelList__add-wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={onAddClick}
            className="LLMModelList__add-btn"
          >
            <Icon mui size="small">AddIcon</Icon>
            언어모델 추가
          </Button>
        </FlexBox>
      )}
    </FlexBox>
  );
}
