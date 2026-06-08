// ============================================
// MUI 컴포넌트 size prop에 ComponentSize 확장값(xsmall, xlarge) 추가
// ComponentSize 타입의 base/MUI native 타입 정합성 확보
// ============================================

import "@mui/material/Button";
import "@mui/material/IconButton";
import "@mui/material/SvgIcon";
import "@mui/material/Icon";

declare module "@mui/material/Button" {
  interface ButtonPropsSizeOverrides {
    xsmall: true;
    xlarge: true;
  }
}

declare module "@mui/material/IconButton" {
  interface IconButtonPropsSizeOverrides {
    xsmall: true;
    xlarge: true;
  }
}

declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsSizeOverrides {
    xsmall: true;
    xlarge: true;
  }
}

declare module "@mui/material/Icon" {
  interface IconPropsSizeOverrides {
    xsmall: true;
    xlarge: true;
  }
}
