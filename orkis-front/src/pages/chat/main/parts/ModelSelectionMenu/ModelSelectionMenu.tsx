// ============================================
// ModelSelectionMenu — LLM 모델 선택 드롭다운
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  Icon,
  ListItemText,
  Menu,
  MenuItem,
} from "@/components";
import type { LLMModelResponse } from "@/logic/common/llm/types/llmModel";
import "./ModelSelectionMenu.scss";

// ============================================
// Props
// ============================================

export interface ModelSelectionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  models: LLMModelResponse[];
  currentModel: LLMModelResponse | null | undefined;
  onSelect: (model: LLMModelResponse) => void;
}

// ============================================
// ModelSelectionMenu
// ============================================

export function ModelSelectionMenu({
  anchorEl,
  open,
  onClose,
  models,
  currentModel,
  onSelect,
}: ModelSelectionMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      className="ModelSelectionMenu"
    >
      {models.length === 0 ? (
        <MenuItem disabled className="ModelSelectionMenu__empty">
          <ListItemText
            className="ModelSelectionMenu__empty-text"
            primary="사용 가능한 모델이 없습니다"
          />
        </MenuItem>
      ) : (
        models.map((model) => {
          const isSelected = currentModel?.id === model.id;
          return (
            <MenuItem
              key={model.id}
              onClick={() => onSelect(model)}
              selected={isSelected}
              className="ModelSelectionMenu__item"
            >
              <ListItemText
                className="ModelSelectionMenu__item-text"
                primary={model.displayName || model.modelName}
                secondary={model.modelName}
              />
              {isSelected && (
                // <CheckIcon className="ModelSelectionMenu__check-icon" />
                <Icon size="small" className="ModelSelectionMenu__check-icon">check</Icon>
              )}
            </MenuItem>
          );
        })
      )}
    </Menu>
  );
}
