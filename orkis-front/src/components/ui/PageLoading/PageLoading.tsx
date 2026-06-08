import { CircularProgress } from "@/components/base/CircularProgress";
import { Box } from "@/components/base/Box";
import "./PageLoading.scss";


export function PageLoading() {
  return (
    <Box
      sx={{
        // display: "flex",
        // justifyContent: "center",
        // alignItems: "center",
        // minHeight: "200px",
        // width: "100%",
      }}
      className="PageLoading__base"
    >
      <CircularProgress />
    </Box>
  );
}
