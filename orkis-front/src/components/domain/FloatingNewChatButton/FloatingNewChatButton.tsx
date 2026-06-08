import { forwardRef } from "react";
import clsx from "clsx";
import { Box } from "@/components/base/Box";
import { AddIcon } from "@/components/base/MuiIcon";
import "./FloatingNewChatButton.scss";

export interface FloatingNewChatButtonProps {
  onClick: () => void;
  isCreating?: boolean;
  className?: string;
}

// 1280px 이하 화면에서만 표시. body.mo-reWrap 클래스가 활성화되면 display:flex
// (index.html 의 resize 핸들러가 body 클래스를 토글).
export const FloatingNewChatButton = forwardRef<HTMLDivElement, FloatingNewChatButtonProps>(
  function FloatingNewChatButton({ onClick, isCreating = false, className }, ref) {
    return (
      <Box
        ref={ref}
        className={clsx(
          "FloatingNewChatButton",
          isCreating && "FloatingNewChatButton--disabled",
          className,
        )}
        onClick={isCreating ? undefined : onClick}
        role="button"
        title="새채팅 추가"
        aria-label="새 채팅 추가"
        aria-disabled={isCreating}
      >
        <AddIcon className="FloatingNewChatButton__icon" />
      </Box>
    );
  },
);
