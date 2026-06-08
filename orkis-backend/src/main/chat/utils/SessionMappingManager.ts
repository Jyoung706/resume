/**
 * 세션-채팅ID 매핑 관리자 (메모리 기반)
 * Redis 쓰기를 대체하여 아키텍처 일관성 유지
 */
export class SessionMappingManager {
  private static instance: SessionMappingManager;
  private mappings: Map<string, {
    chatId: string;
    createdAt: number;
    expiresAt: number;
  }> = new Map();

  private constructor() {
    // 만료된 매핑들을 정리하는 정기 작업 (5분마다)
    setInterval(() => {
      this.cleanupExpiredMappings();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): SessionMappingManager {
    if (!SessionMappingManager.instance) {
      SessionMappingManager.instance = new SessionMappingManager();
    }
    return SessionMappingManager.instance;
  }

  /**
   * 세션ID와 채팅ID 매핑 저장
   * @param sessionId - 세션 ID
   * @param chatId - RAG 서버 채팅 ID
   * @param ttlSeconds - 만료 시간 (기본: 1시간)
   */
  public setMapping(sessionId: string, chatId: string, ttlSeconds: number = 3600): void {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);
    
    this.mappings.set(sessionId, {
      chatId,
      createdAt: now,
      expiresAt
    });

  }

  /**
   * 세션ID로 채팅ID 조회
   * @param sessionId - 세션 ID
   * @returns 채팅 ID 또는 null
   */
  public getMapping(sessionId: string): string | null {
    const mapping = this.mappings.get(sessionId);
    
    if (!mapping) {
      return null;
    }

    // 만료 확인
    if (Date.now() > mapping.expiresAt) {
      this.mappings.delete(sessionId);
      return null;
    }

    return mapping.chatId;
  }

  /**
   * 특정 세션 매핑 제거
   * @param sessionId - 세션 ID
   */
  public removeMapping(sessionId: string): boolean {
    const removed = this.mappings.delete(sessionId);
    if (removed) {
    }
    return removed;
  }

  /**
   * 만료된 매핑들 정리
   */
  private cleanupExpiredMappings(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, mapping] of this.mappings.entries()) {
      if (now > mapping.expiresAt) {
        this.mappings.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
    }
  }

  /**
   * 현재 활성 매핑 수 반환
   */
  public getActiveMappingCount(): number {
    return this.mappings.size;
  }

  /**
   * 모든 매핑 정리 (테스트용)
   */
  public clearAllMappings(): void {
    const count = this.mappings.size;
    this.mappings.clear();
  }

  /**
   * 매핑 통계 정보
   */
  public getStats(): {
    totalMappings: number;
    activeMappings: number;
    expiredMappings: number;
  } {
    const now = Date.now();
    let activeMappings = 0;
    let expiredMappings = 0;

    for (const mapping of this.mappings.values()) {
      if (now > mapping.expiresAt) {
        expiredMappings++;
      } else {
        activeMappings++;
      }
    }

    return {
      totalMappings: this.mappings.size,
      activeMappings,
      expiredMappings
    };
  }
}

// 싱글톤 인스턴스 내보내기
export const sessionMappingManager = SessionMappingManager.getInstance();