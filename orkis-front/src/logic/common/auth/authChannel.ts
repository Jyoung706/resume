/**
 * 탭 간 인증 이벤트 통신 채널 (BroadcastChannel API)
 * postMessage를 보낸 탭에서 이벤트가 발생하지 않으므로 무한루프 불가.
 * 미지원 브라우저에서는 noop 폴백 — 멀티탭 동기화 비활성, 단일 탭 동작 정상.
 */
type AuthChannelLike = Pick<
  BroadcastChannel,
  "postMessage" | "addEventListener" | "removeEventListener"
>;

const noop: AuthChannelLike = {
  postMessage() {},
  addEventListener() {},
  removeEventListener() {}
};

export const authChannel: AuthChannelLike =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("orkis_auth")
    : noop;
