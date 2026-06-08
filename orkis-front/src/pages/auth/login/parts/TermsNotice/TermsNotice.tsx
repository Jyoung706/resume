// ============================================
// TermsNotice — 약관 동의 안내 문구
// ============================================

import clsx from "clsx";
import { FlexBox, Link, Typography } from "@/components";
import "../login.parts.scss";

interface TermsLinkProps {
  href: string;
  children: React.ReactNode;
}

function TermsLink({ href, children }: TermsLinkProps) {
  return (
    <Link
      className="TermsNotice__link"
      href={href}
      underline="hover"
      color="text.secondary"
      onClick={(e: React.MouseEvent) => e.preventDefault()}
    >
      {children}
    </Link>
  );
}

export interface TermsNoticeProps {
  className?: string;
}

export function TermsNotice({ className }: TermsNoticeProps) {
  return (
    <FlexBox className={clsx("TermsNotice", className)}>
      <Typography variant="caption" color="text.secondary">
        회원이 되시면
      </Typography>
      <TermsLink href="#">이용약관</TermsLink>
      <Typography variant="caption" color="text.secondary">
        ,
      </Typography>
      <TermsLink href="#">개인정보처리방침</TermsLink>
      <Typography variant="caption" color="text.secondary">
        에 동의하게 됩니다.
      </Typography>
    </FlexBox>
  );
}
