// ============================================
// DbTypeSelection — DB 타입 선택 그리드
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  Box,
  CardActionArea,
  CircularProgress,
  FlexBox,
  Paper,
  StorageIcon,
  Typography,
} from "@/components";
import type { DbType } from "@/logic/common/db/types/dbConnection";

// ============================================
// Props
// ============================================

export interface DbTypeSelectionProps {
  dbTypes: DbType[];
  selectedTypeId: number | null;
  onChange: (dbType: DbType) => void;
  loading?: boolean;
}

// ============================================
// DbTypeSelection
// ============================================

export function DbTypeSelection({
  dbTypes,
  selectedTypeId,
  onChange,
  loading,
}: DbTypeSelectionProps) {
  if (loading) {
    return (
      <FlexBox justify="center" align="center" className="DbTypeSelection__loading">
        <CircularProgress size="medium" />
      </FlexBox>
    );
  }

  return (
    <Box className="DbTypeSelection">
      {(dbTypes ?? [])
        .filter((t) => t.isActive)
        .map((dbType) => {
        const isSelected = dbType.dbTypeId === selectedTypeId;
        const logoSrc = dbType.logoUrl || null;

        const cardClass = [
          "DbTypeSelection__card",
          isSelected && "DbTypeSelection__card--selected",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Paper key={dbType.dbTypeId} variant="outlined" className={cardClass}>
            <CardActionArea
              onClick={() => onChange(dbType)}
              className="DbTypeSelection__action"
            >
              <FlexBox
                direction="column"
                align="center"
                justify="center"
                className="DbTypeSelection__content"
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={dbType.displayName || dbType.typeName}
                    className="DbTypeSelection__logo"
                  />
                ) : (
                  <StorageIcon
                    className="DbTypeSelection__icon"
                    color={isSelected ? "primary" : "action"}
                  />
                )}
                <Typography className="DbTypeSelection__label">
                  {dbType.displayName || dbType.typeName}
                </Typography>
              </FlexBox>
            </CardActionArea>
          </Paper>
        );
      })}
    </Box>
  );
}
