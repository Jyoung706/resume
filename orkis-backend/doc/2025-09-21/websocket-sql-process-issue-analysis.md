# WebSocket SQL 처리 문제점 분석 문서

## 개요
백엔드 채팅 시스템에서 SQL 답변 처리 시 프로세스 전달 방식이 기존과 변경되어 프론트엔드에서 정상적으로 처리하지 못하는 문제 발생

## 작성일
2025-09-21

## 현재 상태
- **문제 상황**: SQL 질문 응답 시 프론트엔드에서 프로세스 상태를 정상적으로 표시하지 못함
- **영향 범위**: SQL 타입의 모든 채팅 요청
- **최근 변경사항**: WebSocket 메시지 핸들러 및 채팅 서비스 로직 수정

## 코드 분석 결과

### 1. 백엔드 WebSocket 메시지 처리 흐름

#### 현재 구현 (`MessageHandler.ts`)

```typescript
// SQL 질문 처리 시 메시지 흐름
1. USER_MESSAGE 수신
2. AI 서버로부터 chat_id 획득
3. MESSAGE_ID_ASSIGNED 전송 (tempMessageId → assignedMessageId)
4. CLASSIFICATION_RESULT 전송 (type: 'sql')
5. PROCESSING_STATUS 전송 (status: 'processing')
6. Redis에서 프로세스 상태 폴링 시작
7. SQL_STEP 메시지 전송 (프로세스별 진행상황)
8. FINAL_RESULT 전송 (SQL 결과 데이터 포함)
9. PROCESSING_STATUS 전송 (status: 'completed')
```

### 2. 문제점 분석

#### 문제 1: SQL_STEP 페이로드 구조 불일치

**백엔드 전송 데이터 (MessageHandler.ts:1233-1256)**
```typescript
const sqlStepPayload = {
  messageId,
  step: this.mapProcessToStep(process.process_id),  // SQLProcessStep enum
  progress,
  message: this.getProcessMessage(process),
  sequence: parseInt(process.sequence),
  status: process.status,
  processes: sortedProcesses.map((p: any) => ({
    id: p.process_id,
    label: this.getProcessLabel(p.process_id),
    status: p.stat === 1 ? "success" :
            p.stat === 0 ? "processing" : "pending",
    percentage: p.stat === 1 ? "100" :
                p.stat === 0 ? "50" : "0"
  }))
};
```

**타입 정의 문제 (types.ts:69-78)**
```typescript
export interface SqlStepPayload {
  messageId: string;
  step: SQLProcessStep;     // 'step' 속성 사용
  progress: number;
  message?: string;
  // processes, sequence, status 등 누락
}
```

**실제 전송되는 속성과 타입 정의 불일치**:
- `processes` 배열 속성 누락
- `sequence` 속성 누락
- `status` 속성 누락

#### 문제 2: FINAL_RESULT 페이로드 구조 변경

**백엔드 전송 데이터 (MessageHandler.ts:1287-1343)**
```typescript
const finalPayload: any = {
  messageId,
  content: "",  // SQL 쿼리를 직접 표시하지 않음
  metadata: status.metadata,
  result: {
    type: "sql",
    sqlQuery: status.answer || "",
    title: status.queryTitle || "SQL 쿼리 실행 결과",
    columns: status.columns || [],
    data: status.data || [],
    metadata: {
      query: status.answer || "",
      executionTime: status.executionTime || null,
      affectedRows: status.affectedRows || null
    }
  }
};
```

**기존 구조와의 차이점**:
- `content`가 빈 문자열로 설정됨 (SQL 쿼리 직접 표시 안함)
- `result` 객체 내부에 중첩된 구조
- `metadata`가 중복으로 존재 (최상위와 result 내부)

#### 문제 3: 프론트엔드 스테퍼 업데이트 로직

**프론트엔드 처리 (useProcessStepper.ts:375-430)**
```typescript
// 레거시 processes 배열 변환 로직
export const convertProcessesToStepperState = (processes: any[], sqlQuery?: string) => {
  const processDefinitions = [
    { id: 'generate_hint', name: '힌트 생성', ... },
    { id: 'schema_linking', name: '스키마 연결', ... },
    { id: 'generate_sql', name: 'SQL 생성', ... },
    { id: 'evaluate', name: '검증', ... }
  ];
  // ...
}
```

**문제점**:
- 백엔드에서 보내는 `processes` 배열 구조와 프론트엔드 기대 구조 불일치
- `process_id` vs `id` 속성명 차이
- `stat` 값(0, 1) vs `status` 문자열('pending', 'running', 'completed') 변환 로직

### 3. 근본 원인

#### 원인 1: 인터페이스 정의와 실제 구현 불일치
- TypeScript 타입 정의(`SqlStepPayload`)가 실제 전송되는 데이터 구조와 다름
- 백엔드에서 `any` 타입으로 페이로드 생성하여 타입 체크 우회

#### 원인 2: 프로세스 상태 매핑 로직 불일치
- 백엔드: `stat` 값 (0, 1) 사용
- 프론트엔드: `status` 문자열 ('pending', 'running', 'completed') 기대
- 변환 로직이 양쪽에 분산되어 있어 동기화 어려움

#### 원인 3: 메시지 구조 변경 시 하위 호환성 미고려
- 기존 프론트엔드 코드가 기대하는 구조와 다른 형태로 메시지 전송
- 레거시 호환성 처리 로직이 있지만 제대로 작동하지 않음

### 4. 해결 방안

#### 방안 1: 타입 정의 수정 및 통일

**수정된 SqlStepPayload 인터페이스**:
```typescript
export interface SqlStepPayload {
  messageId: string;
  step: SQLProcessStep;
  progress: number;
  message?: string;
  sequence?: number;
  status?: string;
  processes?: Array<{
    id: string;
    label: string;
    status: string;
    percentage: string;
  }>;
}
```

#### 방안 2: 백엔드 메시지 전송 로직 표준화

1. **타입 안전성 확보**
   - `any` 타입 사용 최소화
   - 정의된 인터페이스 준수

2. **프로세스 상태 매핑 통일**
   - 일관된 상태 값 사용 (문자열 기반)
   - 백엔드에서 변환 후 전송

3. **하위 호환성 유지**
   - 기존 필드 유지하면서 새로운 필드 추가
   - Optional 필드로 점진적 마이그레이션

#### 방안 3: 프론트엔드 수신 로직 개선

1. **유연한 데이터 처리**
   - 다양한 형태의 프로세스 데이터 수용
   - Fallback 로직 강화

2. **에러 핸들링 개선**
   - 예상치 못한 데이터 구조 대응
   - 사용자에게 의미있는 피드백 제공

### 5. 즉시 적용 가능한 수정 사항

#### 백엔드 MessageHandler.ts 수정 필요 부분:

1. **SQL_STEP 메시지 전송 부분 (1233-1256행)**
   - `step` 대신 `currentStep` 사용 고려
   - `processes` 배열의 속성명 통일

2. **FINAL_RESULT 메시지 전송 부분 (1287-1343행)**
   - `content`에 SQL 쿼리 포함 여부 재검토
   - `result` 구조 단순화

3. **프로세스 상태 매핑 (1186-1204행)**
   - `stat` 값 해석 로직 명확화
   - 진행률 계산 로직 개선

### 6. 테스트 시나리오 및 확인 방법

#### 6.1 테스트 시나리오

1. **SQL 질문 전송**
   - "직원 테이블에서 모든 데이터를 조회해줘"
   - 프로세스 단계별 표시 확인

2. **프로세스 상태 확인**
   - generate_hint → schema_linking → generate_sql → evaluate
   - 각 단계별 진행률 표시 확인

3. **최종 결과 표시**
   - SQL 쿼리 결과 테이블 표시
   - 메타데이터 (실행 시간, 영향받은 행 수 등) 표시

#### 6.2 백엔드 로그 확인 방법

##### 예상 로그 출력 (정리 후)

```bash
# SQL 질문 처리 시 로그 흐름
[MessageHandler] USER_MESSAGE 메시지 수신, sessionId: xxx, tempMessageId: yyy
[MessageHandler] AI 응답 수신 - chat_id: abc123
[MessageHandler] 질문 분류: sql
[MessageHandler] 프로세스 상태 변경: [1] generate_hint - null → running
[MessageHandler] 프로세스 상태 변경: [1] generate_hint - running → completed
[MessageHandler] 프로세스 상태 변경: [2] schema_linking - null → running
[MessageHandler] 프로세스 상태 변경: [2] schema_linking - running → completed
[MessageHandler] 프로세스 상태 변경: [3] generate_sql - null → running
[MessageHandler] 프로세스 상태 변경: [3] generate_sql - running → completed
[MessageHandler] 프로세스 상태 변경: [4] evaluate - null → running
[MessageHandler] 프로세스 상태 변경: [4] evaluate - running → completed
[MessageHandler] SQL 결과 받음 - Redis 스트림 완료
```

##### 제거된 로그들 (주석 처리됨)

- Redis 폴링 로그: "Redis 상태 확인...", "프로세스 키 확인..."
- 중복 상태 로그: "현재 Redis 상태", "processData 값"
- Redis 등록 로그: "Redis consumer 0_1 등록", "Redis consumer 0_2 등록"
- 디버그 로그: "sortedProcesses", "currentState"

#### 6.3 프론트엔드 확인 포인트

1. **프로세스 상태 표시**
   - 각 프로세스가 pending → running → completed로 순차적 진행
   - 완료된 프로세스가 다시 running으로 되돌아가지 않음

2. **WebSocket 메시지 수신**
   - SQL_STEP 메시지의 processes 배열 정상 수신
   - 각 프로세스의 status 값이 문자열("pending", "running", "completed")로 수신

### 7. 적용된 수정사항 (2025-09-21)

#### 7.1 타입 정의 수정 완료
- `SqlStepPayload` 인터페이스에 누락된 필드 추가 (sequence, status, processes)
- `FinalResultPayload` 인터페이스 구조 개선

#### 7.2 MessageHandler.ts 수정 완료

##### 프로세스 상태 정규화
```typescript
// stat 값(0, 1)을 문자열로 변환
const normalizedStatus = process.stat === 1 ? "completed" :
                        process.stat === 0 ? "running" : "pending";
```

##### 개별 프로세스 변경 감지
```typescript
// 각 프로세스별로 상태 변경 감지하여 실제 변경된 경우만 전송
for (const process of sortedProcesses) {
  const lastSentState = this.lastSentProcessStates.get(`${chatId}:${process.process_id}`);
  const processStateChanged = !lastSentState || lastSentState.status !== normalizedStatus;
  if (processStateChanged) {
    hasAnyChange = true;
    // 개별 프로세스 상태 업데이트
  }
}
```

##### 프로세스 배열 구조 표준화
```typescript
processes: sortedProcesses.map((p: any) => ({
  id: p.process_id,
  label: this.getProcessLabel(p.process_id),
  status: p.stat === 1 ? "completed" :
          p.stat === 0 ? "running" : "pending",
  percentage: p.stat === 1 ? "100" :
              p.stat === 0 ? "50" : "0"
}))
```

#### 7.3 로그 정리 완료
- 상태 변경 시점 로그만 유지
- Redis 폴링 로그 주석 처리
- 프로세스 진행 단계 명확히 확인 가능하도록 개선

### 8. 결론

현재 SQL 처리 문제는 다음과 같이 해결되었습니다:

1. **타입 불일치 해결**: TypeScript 인터페이스와 실제 전송 데이터 구조 통일
2. **프로세스 상태 매핑 표준화**: stat 값(0, 1)을 문자열("running", "completed")로 일관되게 변환
3. **개별 프로세스 추적**: 전체 프로세스를 한번에 전송하는 대신 실제 변경된 프로세스만 전송
4. **로그 최적화**: 불필요한 로그 제거로 디버깅 효율성 향상

### 9. 테스트 및 검증 가이드

#### 9.1 수정 후 검증 항목

- [ ] SQL 질문 시 프로세스 상태가 순차적으로 업데이트되는지 확인
- [ ] 완료된 프로세스가 다시 running으로 변경되지 않는지 확인
- [ ] 백엔드 로그에 상태 변경 시점만 조회되는지 확인
- [ ] 프론트엔드에서 SQL 프로세스 스텍퍼가 정상 동작하는지 확인
- [ ] SQL 쿼리 결과가 올바른 형식으로 표시되는지 확인

#### 9.2 테스트 쿼리 예시

```sql
-- 간단한 테스트 쿼리
"직원 테이블에서 모든 데이터를 조회해줘"
"부서별 직원 수를 계산해줘"
"연봉이 5000만원 이상인 직원들을 찾아줘"
```

#### 9.3 문제 발생 시 디버깅 방법

1. **백엔드 로그 확인**
   ```bash
   docker logs orkis-backend-dev -f
   ```

2. **WebSocket 메시지 확인**
   - 브라우저 개발자 도구에서 Network 탭의 WS 필터 적용
   - Messages 탭에서 SQL_STEP 메시지 확인

3. **Redis 상태 확인 (필요 시)**
   ```bash
   # Redis CLI로 직접 확인
   redis-cli
   > HGETALL "chatId:process"
   ```

### 10. 추가 권장사항

1. **통합 테스트 환경 구축**
   - WebSocket 메시지 흐름 테스트
   - 엔드투엔드 시나리오 테스트

2. **메시지 스키마 문서화**
   - 각 메시지 타입별 정확한 스키마 정의
   - 버전 관리 및 변경 이력 추적

3. **모니터링 강화**
   - WebSocket 메시지 로깅
   - 에러 발생 시 자동 알림

4. **점진적 마이그레이션 전략**
   - 기존 코드 유지하면서 새로운 구조 도입
   - Feature flag를 통한 단계적 배포