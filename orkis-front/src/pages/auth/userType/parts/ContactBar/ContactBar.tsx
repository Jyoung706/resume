// ============================================
// ContactBar — 연락처 정보 바
// ============================================

import { type ReactNode } from "react";
import clsx from "clsx";
import { FlexBox, Typography } from "@/components";
import "../userType.parts.scss";

export interface ContactItem {
  icon: ReactNode;
  label: string;
}

export interface ContactBarProps {
  className?: string;
  items: ContactItem[];
}

export function ContactBar({ className, items }: ContactBarProps) {
  return (
    <FlexBox className={clsx("ContactBar__container", className)}>
      {items.map((item, idx) => (
        <FlexBox key={idx} className="ContactBar__item">
          {item.icon}
          <Typography
            variant="body2"
            fontWeight={500}
            color="var(--text-muted)"
          >
            {item.label}
          </Typography>
        </FlexBox>
      ))}
    </FlexBox>
  );
}
