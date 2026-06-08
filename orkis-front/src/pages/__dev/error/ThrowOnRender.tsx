// ============================================
// __dev/error/ThrowOnRender
// 버튼 클릭 시 state를 업데이트하여 다음 렌더에서 throw.
// Error Boundary는 이벤트 핸들러를 잡지 못하므로, 렌더 시점에 throw 해야 한다.
// ============================================

import { useState } from "react";
import { Button } from "@/components";

export interface ThrowOnRenderProps {
  label?: string;
  message?: string;
}

export function ThrowOnRender({
  label = "에러 트리거",
  message = "[dev test] forced error",
}: ThrowOnRenderProps) {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) {
    throw new Error(message);
  }
  return (
    <Button variant="contained" color="error" onClick={() => setShouldThrow(true)}>
      {label}
    </Button>
  );
}
