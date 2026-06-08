// ============================================
// AuthCard 검증 페이지 (T1-2 검증용)
// ============================================
// title / subtitle / leadingIcon / children / footer 슬롯 조합 시각 확인.
// ResetPasswordPage 4상태 시뮬레이션 포함 (validating은 AuthCard 미적용 — 비교용).
// 시각은 auth.mixin이 책임 — 기존 LoginPage 등과 동일해야 함.
// ============================================

import {
  Button,
  CircularProgress,
  FlexBox,
  Icon,
  Input,
  Link,
  Paper,
  Stack,
  Typography,
} from "@/components";
import { AuthCard } from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function AuthCardTemplate() {
  return (
    <Stack className="ok-auth-card-template" spacing={4}>
      <Typography variant="h4">AuthCard</Typography>

      <Typography variant="body2" color="text.secondary">
        T1-2 검증: title / subtitle / leadingIcon / children / footer 슬롯 조합.
        시각은 <code>auth.mixin</code>이 책임 (auth.card / auth.card-title /
        auth.card-subtitle).
      </Typography>

      {/* 기본 — LoginPage 패턴 */}
      <ExampleBlock
        title="기본 — LoginPage 패턴"
        code={`<AuthCard
  title="로그인"
  subtitle="계정 정보를 입력하세요"
>
  <Input label="이메일" />
  <Input label="비밀번호" type="password" />
  <Button variant="contained" fullWidth size="large">로그인</Button>
</AuthCard>`}
      >
        <AuthCard title="로그인" subtitle="계정 정보를 입력하세요">
          <Stack spacing={1.5}>
            <Input label="이메일" fullWidth />
            <Input label="비밀번호" type="password" fullWidth />
            <Button variant="contained" fullWidth size="large">
              로그인
            </Button>
          </Stack>
        </AuthCard>
      </ExampleBlock>

      {/* leadingIcon + title + subtitle — ResetPasswordPage success */}
      <ExampleBlock
        title="leadingIcon + title + subtitle (ResetPasswordPage success 상태)"
        code={`<AuthCard
  leadingIcon={<CheckCircleOutlineIcon color="success" sx={{ fontSize: "4rem" }} />}
  title="비밀번호 변경 완료"
  subtitle="비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요."
>
  <Button variant="contained" fullWidth size="large">로그인하기</Button>
</AuthCard>`}
      >
        <AuthCard
          leadingIcon={
            <Icon mui sx={{ fontSize: "4rem", color: "var(--success)" }}>
              CheckCircleOutlineIcon
            </Icon>
          }
          title="비밀번호 변경 완료"
          subtitle={
            <>
              비밀번호가 성공적으로 변경되었습니다.
              <br />새 비밀번호로 로그인해주세요.
            </>
          }
        >
          <Button variant="contained" fullWidth size="large">
            로그인하기
          </Button>
        </AuthCard>
      </ExampleBlock>

      {/* leadingIcon (error) — ResetPasswordPage expired */}
      <ExampleBlock
        title="leadingIcon (error) — ResetPasswordPage expired 상태"
        code={`<AuthCard
  leadingIcon={<ErrorOutlineIcon color="error" sx={{ fontSize: "4rem" }} />}
  title="링크 만료"
  subtitle="비밀번호 재설정 링크가 만료되었습니다."
>
  <Stack spacing={1}>
    <Button variant="outlined" fullWidth size="large">새 링크 요청</Button>
    <Button variant="contained" fullWidth size="large">로그인으로 이동</Button>
  </Stack>
</AuthCard>`}
      >
        <AuthCard
          leadingIcon={
            <Icon mui sx={{ fontSize: "4rem", color: "var(--error)" }}>
              ErrorOutlineIcon
            </Icon>
          }
          title="링크 만료"
          subtitle="비밀번호 재설정 링크가 만료되었습니다."
        >
          <Stack spacing={1}>
            <Button variant="outlined" fullWidth size="large">
              새 링크 요청
            </Button>
            <Button variant="contained" fullWidth size="large">
              로그인으로 이동
            </Button>
          </Stack>
        </AuthCard>
      </ExampleBlock>

      {/* validating — AuthCard 미적용 비교 */}
      <ExampleBlock
        title="validating 상태 — AuthCard 미적용 (비교용, 원본 Paper)"
        code={`{/* AuthCard에 title 없이는 부적합 — Paper 직접 사용 */}
<Paper className="ResetPwPage__card">
  <FlexBox direction="column" align="center" justify="center" sx={{ minHeight: "18.75rem" }}>
    <CircularProgress size={48} />
    <Typography variant="body2" color="text.secondary" mt={2}>
      링크 확인 중...
    </Typography>
  </FlexBox>
</Paper>`}
      >
        <Paper elevation={0} p={4.5} style={{ borderRadius: "1.25rem" }}>
          <FlexBox
            direction="column"
            align="center"
            justify="center"
            gap={2}
            style={{ minHeight: "18.75rem" }}
          >
            <CircularProgress size="xlarge" />
            <Typography variant="body2" color="text.secondary">
              링크 확인 중...
            </Typography>
          </FlexBox>
        </Paper>
      </ExampleBlock>

      {/* footer 슬롯 — LoginPage 회원가입 링크 */}
      <ExampleBlock
        title="footer 슬롯 — 회원가입 / 비밀번호 찾기 링크"
        code={`<AuthCard
  title="로그인"
  subtitle="계정 정보를 입력하세요"
  footer={
    <FlexBox direction="column" align="center" gap={1}>
      <Link href="#">비밀번호 찾기</Link>
      <FlexBox gap={0.5} align="center">
        <Typography variant="caption">계정이 없으신가요?</Typography>
        <Link href="#">회원가입</Link>
      </FlexBox>
    </FlexBox>
  }
>
  ...
</AuthCard>`}
      >
        <AuthCard
          title="로그인"
          subtitle="계정 정보를 입력하세요"
          footer={
            <FlexBox direction="column" align="center" gap={1}>
              <Link href="#">비밀번호 찾기</Link>
              <FlexBox gap={0.5} align="center">
                <Typography variant="caption">계정이 없으신가요?</Typography>
                <Link href="#">회원가입</Link>
              </FlexBox>
            </FlexBox>
          }
        >
          <Stack spacing={1.5}>
            <Input label="이메일" fullWidth />
            <Input label="비밀번호" type="password" fullWidth />
            <Button variant="contained" fullWidth size="large">
              로그인
            </Button>
          </Stack>
        </AuthCard>
      </ExampleBlock>

      {/* className 위임 검증 */}
      <ExampleBlock
        title="className 위임 — 페이지 SCSS 매칭 검증"
        code={`<AuthCard
  className="LoginPage__card"   // 페이지 SCSS의 .LoginPage__card 그대로 매칭
  title="로그인"
  subtitle="..."
>
  ...
</AuthCard>`}
      >
        <Typography variant="body2" color="text.secondary">
          className prop으로 페이지 SCSS의 BEM 셀렉터(예:{" "}
          <code>LoginPage__card</code>)를 전달하면 페이지 SCSS의 modifier도
          그대로 적용됨. AuthCard 자체 시각은 <code>auth.mixin</code>이 책임,
          페이지별 micro-tuning은 페이지 SCSS에 위임.
        </Typography>
      </ExampleBlock>
    </Stack>
  );
}
