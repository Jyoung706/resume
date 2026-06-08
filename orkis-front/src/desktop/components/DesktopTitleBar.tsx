import { styled } from "@mui/material/styles";

const DragRegion = styled("div")({
  WebkitAppRegion: "drag",
  height: "2.5rem",
  position: "absolute",
  width: "100%",
  left: 0,
  top: 0,
  zIndex: 99,
  pointerEvents: "none",
});

export const DesktopTitleBar: React.FC = () => {
  return <DragRegion />;
};
