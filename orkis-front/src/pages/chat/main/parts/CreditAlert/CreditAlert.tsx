// ============================================
// CreditAlert — 크레딧/질문 횟수 알림 박스
// Design Layer: props 기반 (로직 없음)
// ============================================

import { FlexBox, Icon, Stack, Typography } from "@/components";
import clsx from "clsx";
import "../chat.parts.scss";

// ============================================
// Props
// ============================================

export interface CreditAlertProps {
  className?: string;
  /** 사용한 횟수 */
  used: number;
  /** 전체 횟수 */
  total: number;
  /** 소진 시 표시할 메시지 */
  exhaustedMessage?: string;
}

// ============================================
// CreditAlert
// ============================================

export function CreditAlert({
  className,
  used,
  total,
  exhaustedMessage
}: CreditAlertProps) {
  const remaining = total - used;
  const isExhausted = used >= total;

  return (
    <FlexBox className={clsx("CreditAlert__container", className)}>
      <Icon mui>CreditCardIcon</Icon>
      <Stack className="CreditAlert__info">
        <Typography className="CreditAlert__text">
          남은 횟수: {remaining}/{total}
        </Typography>
        {isExhausted && exhaustedMessage && (
          <Typography className="CreditAlert__exhausted">
            {exhaustedMessage}
          </Typography>
        )}
      </Stack>
    </FlexBox>
  );
}
