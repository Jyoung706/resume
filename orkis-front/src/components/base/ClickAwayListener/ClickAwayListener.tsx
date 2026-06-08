// ============================================
// base/ClickAwayListener — MUI ClickAwayListener 래핑
// ============================================

import MuiClickAwayListener, {
  type ClickAwayListenerProps as MuiClickAwayListenerProps
} from "@mui/material/ClickAwayListener";

export interface ClickAwayListenerProps extends MuiClickAwayListenerProps {}

export function ClickAwayListener(props: ClickAwayListenerProps) {
  return <MuiClickAwayListener {...props} />;
}
