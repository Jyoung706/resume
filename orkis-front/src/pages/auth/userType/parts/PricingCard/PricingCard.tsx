// ============================================
// PricingCard — 요금제 카드
// ============================================

import { type ReactNode } from "react";
import clsx from "clsx";
import { Box, Button, FlexBox, Icon, Typography } from "@/components";
import "../userType.parts.scss";

export interface PricingFeature {
  text: string;
  required?: boolean;
}

export interface PricingCardProps {
  className?: string;
  userType: string;
  price: string;
  description: string;
  cta?: ReactNode;
  ctaVariant?: "free" | "admin";
  contactLabel?: string;
  features: PricingFeature[];
  onCtaClick?: () => void;
  onContactClick?: () => void;
}

export function PricingCard({
  className,
  userType,
  price,
  description,
  cta,
  ctaVariant,
  contactLabel,
  features,
  onCtaClick,
  onContactClick,
}: PricingCardProps) {
  return (
    <FlexBox className={clsx("PricingCard__container", className)}>
      {/* 카드 헤더 */}
      <Box className="PricingCard__header">
        <Typography
          fontSize="1.3125rem"
          fontWeight={700}
          color="var(--text-color)"
          className="PricingCard__user-type"
        >
          {userType}
        </Typography>

        <Typography
          fontSize="1.875rem"
          fontWeight={800}
          color="var(--text-color)"
          className="PricingCard__price"
        >
          {price}
        </Typography>

        <Typography
          fontSize="var(--text-base)"
          fontWeight={500}
          color="var(--text-color)"
          className="PricingCard__description"
        >
          {description}
        </Typography>

        {/* CTA 버튼 또는 영업팀 문의 */}
        <Box className="PricingCard__cta-section">
          {cta ? (
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={onCtaClick}
              className={
                ctaVariant === "free"
                  ? "PricingCard__cta-free"
                  : "PricingCard__cta-enterprise"
              }
            >
              {cta}
            </Button>
          ) : contactLabel ? (
            <Button
              // component="button"
              // underline="hover"
              variant="contained"
              size="large"
              fullWidth
              onClick={onContactClick}
              className="PricingCard__contact"
            >
              {contactLabel}
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* 기능 목록 */}
      <Box className="PricingCard__feature-list">
        {features.map((feature, idx) => (
          <FlexBox key={idx} className="PricingCard__feature-item">
            <Icon
              mui
              className={clsx(
                "PricingCard__check-icon",
                feature.required
                  ? "PricingCard__check-required"
                  : "PricingCard__check-normal"
              )}
            >CheckIcon</Icon>
            <Typography
              fontSize="0.9375rem"
              fontWeight={600}
              lineHeight={1.5}
              color={
                feature.required
                  ? "var(--error)"
                  : "var(--text-color)"
              }
            >
              {feature.text}
            </Typography>
          </FlexBox>
        ))}
      </Box>
    </FlexBox>
  );
}
