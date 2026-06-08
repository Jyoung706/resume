// ============================================
// 대시보드 페이지 (실제 페이지 샘플)
// ============================================

import { Grid, Paper, Stack, Typography } from "@/components";

const STATS = [
  { label: "총 사용자", value: "1,234" },
  { label: "활성 프로젝트", value: "56" },
  { label: "오늘 작업", value: "89" },
  { label: "완료율", value: "73%" }
];

export function DashboardPage() {
  return (
    <Stack className="ok-dashboard-page" spacing={3}>
      <Typography variant="h4">Dashboard</Typography>

      <Grid container spacing={2}>
        {STATS.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper p={3} rounded="md" shadow="card">
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {stat.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper p={3} rounded="md" shadow="card">
        <Typography variant="h6" mb={2}>
          환영합니다
        </Typography>
        <Typography variant="body1" color="text.secondary">
          new-orkis-ui 프로젝트의 대시보드 샘플 페이지입니다. 좌측 사이드바의
          Templates 메뉴에서 컴포넌트 쇼케이스를 확인할 수 있습니다. 상단 우측의
          토글 버튼으로 ORKIS 테마 적용/제거 및 다크 모드를 전환할 수 있습니다.
        </Typography>
      </Paper>
    </Stack>
  );
}
