import { Component } from "@orkis/core/common";

// desktop 전용 채팅 스트림 인메모리 상태 (cloud chatRedis/stageRedis stream 대체).
// - tmp/desktop 자산 재활용. userId 필드 추가 (QueryExecutionService 소유권 검증용).
// - backend 가 AI SSE 를 직접 구독하므로 진행 상태가 프로세스 메모리에만 존재.

export interface ProcEvent {
  id: number;
  stat: number;
  timestamp: string;
}

export interface MsgStreamEntry {
  msgId: string;
  procId: number | null;
  tokens: string[];
  ended: boolean;
  startedAt: string;
}

export interface ChatStreamEntry {
  chatId: string;
  sessionId: string;
  userId: string;
  content: string;
  chatType: string | null;
  tokens: string[];
  createdAt: string;
  dbId: string | null;
  connectionId: string | null;
  // 시계열 step 이벤트 (AI stat 원본: 0=running, 1=success, -1=error)
  procEvents: ProcEvent[];
  // AI가 emit한 steps 정의 원본
  steps: Array<Record<string, unknown>> | null;
  // LLM 호출별 토큰 분리 저장 (Cloud {msg_id} Redis Stream 대응)
  msgs: Map<string, MsgStreamEntry>;
  msgOrder: string[];
  currentMsgId: string | null;
}

@Component("ChatStreamContext")
export class ChatStreamContext {
  private streams = new Map<string, ChatStreamEntry>();

  register(
    chatId: string,
    sessionId: string,
    userId: string,
    content: string,
    dbId?: string,
    connectionId?: string
  ): void {
    this.streams.set(chatId, {
      chatId,
      sessionId,
      userId,
      content,
      chatType: null,
      tokens: [],
      createdAt: new Date().toISOString(),
      dbId: dbId || null,
      connectionId: connectionId || null,
      procEvents: [],
      steps: null,
      msgs: new Map(),
      msgOrder: [],
      currentMsgId: null,
    });
  }

  get(chatId: string): ChatStreamEntry | undefined {
    return this.streams.get(chatId);
  }

  /** 진행 중 sessionId 의 entry 조회 (새로고침 복원 — ChatInProgressReader 대체용) */
  findBySessionId(sessionId: string): ChatStreamEntry[] {
    const result: ChatStreamEntry[] = [];
    for (const entry of this.streams.values()) {
      if (entry.sessionId === sessionId) result.push(entry);
    }
    return result;
  }

  appendToken(chatId: string, token: string): void {
    const entry = this.streams.get(chatId);
    if (entry) entry.tokens.push(token);
  }

  resetTokens(chatId: string): void {
    const entry = this.streams.get(chatId);
    if (entry) entry.tokens = [];
  }

  setChatType(chatId: string, chatType: string): void {
    const entry = this.streams.get(chatId);
    if (entry) entry.chatType = chatType;
  }

  appendProcEvent(chatId: string, event: ProcEvent): void {
    const entry = this.streams.get(chatId);
    if (entry) entry.procEvents.push(event);
  }

  setSteps(chatId: string, steps: Array<Record<string, unknown>>): void {
    const entry = this.streams.get(chatId);
    if (entry) entry.steps = steps;
  }

  startMsg(chatId: string, msgId: string, procId: number | null): void {
    const entry = this.streams.get(chatId);
    if (!entry) return;
    entry.msgs.set(msgId, {
      msgId,
      procId,
      tokens: [],
      ended: false,
      startedAt: new Date().toISOString(),
    });
    entry.msgOrder.push(msgId);
    entry.currentMsgId = msgId;
  }

  appendMsgToken(chatId: string, msgId: string, token: string): void {
    const entry = this.streams.get(chatId);
    const msg = entry?.msgs.get(msgId);
    if (msg) msg.tokens.push(token);
  }

  endMsg(chatId: string, msgId: string): void {
    const entry = this.streams.get(chatId);
    const msg = entry?.msgs.get(msgId);
    if (msg) msg.ended = true;
  }

  remove(chatId: string): ChatStreamEntry | undefined {
    const entry = this.streams.get(chatId);
    this.streams.delete(chatId);
    return entry;
  }
}
