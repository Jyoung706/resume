// ============================================
// LLMModelDialog — LLM 모델 등록/수정 다이얼로그
// Design Layer: props 기반 (로직 없음)
// 내부 폼 상태만 관리, 외부 로직은 props로 주입
// Dialog 공통 레이아웃 컴포넌트 활용
// ============================================

import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FlexBox,
  FormControl,
  FormControlLabel,
  Img,
  Input,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  CheckCircleIcon,
  CloseIcon,
  EditIcon,
  SaveIcon,
  ErrorOutlineIcon,
  Dialog,
  PasswordInput,
} from "@/components";
import type {
  LLMModelResponse,
  CreateLLMModelDTO,
  LLMConnectionCheckRequest,
  LLMConnectionCheckResponse,
  LLMProviderResponse,
  LLMAvailableModelResponse,
} from "@/logic/common/llm/types/llmModel";

// ============================================
// Props
// ============================================

export interface LLMModelDialogProps {
  open: boolean;
  onClose: () => void;
  /** null이면 추가 모드, 값 있으면 수정 모드 */
  model?: LLMModelResponse | null;
  /** Provider 목록 */
  providers: LLMProviderResponse[];
  /** 선택된 Provider의 사용 가능 모델 목록 */
  availableModels: LLMAvailableModelResponse[];
  loadingProviders?: boolean;
  loadingModels?: boolean;
  /** Provider 변경 시 콜백 (모델 목록 재로딩용) */
  onProviderChange: (provider: string) => void;
  /** 저장 콜백 */
  onSave: (data: CreateLLMModelDTO) => void;
  /** 연결 확인 콜백 */
  onCheckConnection: (request: LLMConnectionCheckRequest) => void;
  checkResult?: LLMConnectionCheckResponse | null;
  checkLoading?: boolean;
  /** 연결 확인 결과 초기화 */
  onClearCheckResult?: () => void;
  saving?: boolean;
  /** 외부(Connector)에서 전달된 저장 에러 메시지 */
  saveError?: string | null;
}

// ============================================
// 기본 API 엔드포인트 매핑
// ============================================

const DEFAULT_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1/models",
  meta: "https://api.meta.ai/v1/chat/completions",
};

// ============================================
// LLMModelDialog
// ============================================

export function LLMModelDialog({
  open,
  onClose,
  model,
  providers,
  availableModels,
  loadingProviders,
  loadingModels,
  onProviderChange,
  onSave,
  onCheckConnection,
  checkResult,
  checkLoading,
  onClearCheckResult,
  saving,
  saveError,
}: LLMModelDialogProps) {
  const isEditMode = !!model;

  // ── 폼 상태 ──
  const [formData, setFormData] = useState<CreateLLMModelDTO>({
    modelName: "",
    displayName: "",
    provider: "",
    modelType: "chat",
    apiEndpoint: "",
    apiKey: "",
    apiVersion: "",
    parameters: { temperature: 0.7, max_tokens: 2048 },
    isDefault: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [apiKeyModified, setApiKeyModified] = useState(false);

  // ── 수정 모드: 연결 관련 필드(provider, modelName) 변경 여부 ──
  const providerChanged = isEditMode && formData.provider !== model?.provider;
  const modelNameChanged = isEditMode && formData.modelName !== model?.modelName;

  // ── 연결 확인 필요 여부 ──
  // 등록: 항상 필요 / 수정: provider, 모델명, API 키 중 하나라도 변경 시 필요
  const needsConnectionCheck = !isEditMode || providerChanged || modelNameChanged || apiKeyModified;

  // ── model/open 변경 시 폼 초기화 ──
  useEffect(() => {
    if (model) {
      setFormData({
        modelName: model.modelName,
        displayName: model.displayName || model.modelName,
        provider: model.provider,
        modelType: model.modelType || "chat",
        apiEndpoint: model.apiEndpoint || "",
        apiKey: "",
        apiVersion: model.apiVersion || "",
        parameters: model.parameters || { temperature: 0.7, max_tokens: 2048 },
        isDefault: model.isDefault,
      });
    } else {
      setFormData({
        modelName: "",
        displayName: "",
        provider: "",
        modelType: "chat",
        apiEndpoint: "",
        apiKey: "",
        apiVersion: "",
        parameters: { temperature: 0.7, max_tokens: 2048 },
        isDefault: false,
      });
    }
    setError(null);
    setConnectionChecked(false);
    setApiKeyModified(false);
  }, [model, open]);

  // ── providers 로드 완료 시 기본 provider 설정 + 모델 목록 로드 ──
  useEffect(() => {
    if (!open || providers.length === 0) return;

    let providerKey = formData.provider;

    // provider 미선택 또는 목록에 없으면 기본값 설정
    if (!providerKey || !providers.some((p) => p.provider === providerKey)) {
      const defaultProvider =
        providers.find((p) => p.provider === "openai") || providers[0];
      providerKey = defaultProvider.provider;

      setFormData((prev) => ({
        ...prev,
        provider: providerKey,
        apiEndpoint: DEFAULT_ENDPOINTS[providerKey] || prev.apiEndpoint,
      }));
    }

    // 모델 목록 로드 트리거
    onProviderChange(providerKey);
  }, [open, providers]);

  // ── Provider 변경 ──
  const handleProviderChange = (provider: string) => {
    setFormData((prev) => ({
      ...prev,
      provider,
      apiEndpoint: DEFAULT_ENDPOINTS[provider] || "",
      modelName: "",
      displayName: "",
      apiKey: "",
    }));
    // Provider 변경 시 API 키도 변경 필요 (다른 Provider = 다른 키)
    setApiKeyModified(true);
    setConnectionChecked(false);
    onClearCheckResult?.();
    onProviderChange(provider);
  };

  // ── 모델 선택 ──
  const handleModelSelect = (modelIdentifier: string) => {
    const selected = availableModels.find((m) => m.modelIdentifier === modelIdentifier);
    setFormData((prev) => ({
      ...prev,
      modelName: modelIdentifier,
      displayName: selected?.modelName || modelIdentifier,
    }));
    // 모델 변경 시 테스트 리셋
    setConnectionChecked(false);
    onClearCheckResult?.();
  };

  // ── API 키 변경 토글 (수정 모드) ──
  const handleApiKeyToggle = (checked: boolean) => {
    setApiKeyModified(checked);
    setFormData((prev) => ({ ...prev, apiKey: "" }));
    setConnectionChecked(false);
    onClearCheckResult?.();
  };

  // ── 연결 확인 ──
  // 수정 모드 + API 키 미변경 시: modelId 기반 (기존 암호화 키 사용)
  // 등록 모드 또는 API 키 변경 시: 새 API 키 필수
  const handleCheckConnection = () => {
    const useExistingKey = isEditMode && !apiKeyModified;
    if (!useExistingKey && !formData.apiKey) {
      setError("API 키를 입력하세요.");
      return;
    }
    setError(null);
    onCheckConnection({
      modelId: model?.id,
      provider: formData.provider,
      apiEndpoint: formData.apiEndpoint,
      apiKey: useExistingKey ? "" : formData.apiKey,
      modelName: formData.modelName,
    });
    setConnectionChecked(true);
  };

  // ── 저장 ──
  const handleSave = () => {
    if (!formData.modelName || !formData.displayName) {
      setError("모델명과 표시명은 필수입니다.");
      return;
    }
    // API 키 검증: 등록 모드이거나 수정 모드에서 API 키를 변경한 경우에만
    if (needsConnectionCheck && apiKeyModified && !formData.apiKey) {
      setError("API 키를 입력하세요.");
      return;
    }
    if (!isEditMode && !formData.apiKey) {
      setError("API 키를 입력하세요.");
      return;
    }
    if (checkResult && !checkResult.success) {
      setError("연결 확인에 실패했습니다. API 키와 설정을 확인하세요.");
      return;
    }
    setError(null);

    const connectionStatus = checkResult?.success ? ("connected" as const) : undefined;
    const saveData = {
      ...formData,
      connectionStatus: connectionStatus,
    };
    onSave(saveData);
  };

  // ── Provider 로고 렌더링 헬퍼 ──
  const renderProviderOption = (provider: LLMProviderResponse) => (
    <FlexBox align="center" gap="0.5rem">
      {provider.logoUrl && (
        <Img
          src={provider.logoUrl}
          alt={provider.providerName}
          fit="contain"
          className="LLMModelDialog__provider-logo"
        />
      )}
      <Typography>{provider.providerName}</Typography>
    </FlexBox>
  );

  // ── 저장 버튼 비활성화 조건 ──
  // 연결 확인가 필요한 경우 테스트 성공 전까지 비활성화
  const isSaveDisabled =
    saving ||
    checkLoading ||
    (needsConnectionCheck && (!connectionChecked || (checkResult != null && !checkResult.success)));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditMode ? "언어모델 수정" : "언어모델 추가"}
      size="medium"
      className="LLMModelDialog"
      footer={
        <FlexBox className="LLMModelDialog__actions">
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {isEditMode ? <EditIcon className="LLMModelDialog__bottom-edit-icon" /> : <SaveIcon className="LLMModelDialog__bottom-save-icon" />}
            {saving ? <CircularProgress size="small" /> : isEditMode ? "수정" : "저장"}
          </Button>
          <Box className="LLMModelDialog__bottom-close" onClick={onClose}>
            <CloseIcon className="LLMModelDialog__bottom-close-icon" />
            <Typography className="LLMModelDialog__bottom-close-text">취소</Typography>
          </Box>
        </FlexBox>
      }
    >
      <FlexBox direction="column" className="LLMModelDialog__form">
        {(error || saveError) && (
          <Alert severity="error">{error || saveError}</Alert>
        )}

        {/* Provider 선택 */}
        <FormControl fullWidth className="LLMModelDialog__field">
          <InputLabel>Provider</InputLabel>
          <Select
            value={formData.provider}
            onChange={(e) => handleProviderChange(e.target.value as string)}
            label="Provider"
            disabled={loadingProviders}
            renderValue={(selected) => {
              const p = providers.find((pr) => pr.provider === selected);
              return p ? renderProviderOption(p) : (selected as string);
            }}
          >
            {providers.map((p) => (
              <MenuItem key={p.provider} value={p.provider}>
                {renderProviderOption(p)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 모델명 선택 */}
        <FormControl fullWidth className="LLMModelDialog__field">
          <InputLabel>모델명</InputLabel>
          <Select
            value={formData.modelName}
            onChange={(e) => handleModelSelect(e.target.value as string)}
            label="모델명"
            disabled={loadingModels}
            renderValue={(selected) => {
              const m = availableModels.find((am) => am.modelIdentifier === selected);
              return m ? m.modelName : (selected as string);
            }}
          >
            {availableModels.map((m) => (
              <MenuItem key={m.modelIdentifier} value={m.modelIdentifier}>
                <FlexBox direction="column">
                  <Typography className="LLMModelDialog__model-name">{m.modelName}</Typography>
                  <Typography className="LLMModelDialog__model-id">{m.modelIdentifier}</Typography>
                </FlexBox>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 표시명 */}
        <Input
          fullWidth
          label="표시명"
          value={formData.displayName}
          onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
          placeholder="예: GPT-4 (OpenAI)"
          className="LLMModelDialog__field"
        />

        {/* API 키 영역 */}
        <FlexBox direction="column" className="LLMModelDialog__apikey-section">
          {/* 수정 모드: 마스킹된 키 표시 + 변경 토글 */}
          {isEditMode && !providerChanged && (
            <>
              {!apiKeyModified && model?.apiKeyMasked && (
                <Input
                  fullWidth
                  label="현재 API 키"
                  value={model.apiKeyMasked}
                  disabled
                  className="LLMModelDialog__field"
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={apiKeyModified}
                    onChange={(e) => handleApiKeyToggle(e.target.checked)}
                    size="small"
                  />
                }
                label="API 키 변경"
                className="LLMModelDialog__apikey-toggle"
              />
            </>
          )}

          {/* API 키 입력 */}
          {/* 등록: 항상 / 수정+Provider변경: 항상 (새 키 필수) / 수정+Provider유지: 토글 ON 시만 */}
          {(!isEditMode || providerChanged || apiKeyModified) && (
            <PasswordInput
              fullWidth
              label={isEditMode ? "새 API 키" : "API 키"}
              value={formData.apiKey}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, apiKey: e.target.value }));
                setConnectionChecked(false);
                onClearCheckResult?.();
              }}
              placeholder="sk-..."
              className="LLMModelDialog__field"
            />
          )}
        </FlexBox>

        {/* 연결 확인: 테스트가 필요한 경우에만 표시 */}
        {needsConnectionCheck && (
          <Box className="LLMModelDialog__check-section">
            <Button
              variant="contained"
              color="primary"
              onClick={handleCheckConnection}
              disabled={checkLoading || (!isEditMode && !formData.apiKey) || (isEditMode && apiKeyModified && !formData.apiKey)}
              fullWidth
              className="LLMModelDialog__check-btn"
            >
              {checkLoading ? <CircularProgress size="small" /> : "연결 확인"}
            </Button>

            {checkResult && (
              <FlexBox
                align="flex-start"
                className={`LLMModelDialog__check-result ${checkResult.success
                  ? "LLMModelDialog__check-result--success"
                  : "LLMModelDialog__check-result--error"
                  }`}
              >
                {checkResult.success ? (
                  <CheckCircleIcon fontSize="small" className="LLMModelDialog__check-icon--success" />
                ) : (
                  <ErrorOutlineIcon fontSize="small" className="LLMModelDialog__check-icon--error" />
                )}
                <FlexBox direction="column" grow>
                  <Typography className="LLMModelDialog__check-title">
                    {checkResult.success ? "연결 성공" : "연결 실패"}
                  </Typography>
                  {checkResult.success && checkResult.responseTimeMs != null && (
                    <Typography className="LLMModelDialog__check-detail">
                      응답 시간: {checkResult.responseTimeMs}ms
                    </Typography>
                  )}
                  {checkResult.errorMessage && (
                    <Typography className="LLMModelDialog__check-error">
                      {checkResult.errorMessage}
                    </Typography>
                  )}
                </FlexBox>
              </FlexBox>
            )}
          </Box>
        )}
      </FlexBox>
    </Dialog>
  );
}
