# WebSocket 로그 정리 가이드

## 개요
백엔드 채팅 시스템의 WebSocket 로그를 정리하여 프로세스 진행 단계를 명확히 확인할 수 있도록 개선

## 작성일
2025-09-21

## 로그 정리 목적
- SQL 처리 시 프로세스 상태 변경 시점을 명확히 파악
- 불필요한 중복 로그 제거로 디버깅 효율성 향상
- 시스템 동작 흐름을 간결하게 추적

## 정리된 로그 구조

### 1. 유지된 로그 (상태 변경 시점)

#### USER_MESSAGE 수신
```javascript
console.log(`[MessageHandler] USER_MESSAGE 메시지 수신, sessionId: ${sessionId}, tempMessageId: ${tempMessageId}`);
```

#### AI 서버 응답
```javascript
console.log(`[MessageHandler] AI 응답 수신 - chat_id: ${chatId}, answer length: ${answer?.length || 0}`);
```

#### 질문 분류
```javascript
console.log(`[MessageHandler] 질문 분류: ${questionType}`);
```

#### 프로세스 상태 변경
```javascript
console.log(`[MessageHandler] 프로세스 상태 변경: [${process.sequence}] ${process.process_id} - ${lastSentState ? lastSentState.status : "null"} → ${normalizedStatus}`);
```

#### SQL 결과 수신
```javascript
console.log(`[MessageHandler] SQL 결과 받음 - Redis 스트림 완료`);
```

#### General 타입 완료
```javascript
console.log(`[MessageHandler] General 타입 답변 완료 - Redis 스트림 완료`);
```

### 2. 주석 처리된 로그 (불필요한 반복 로그)

#### Redis 폴링 로그
- `// console.log(\`[MessageHandler] Redis 상태 확인 중... chatId: ${chatId}\`);`
- `// console.log(\`[MessageHandler] 프로세스 키 확인: ${processKey}\`);`
- `// console.log("[MessageHandler] 현재 Redis 상태:", currentState);`

#### Redis 등록 로그
- `// console.log("[MessageHandler] Redis consumer 0_1 등록 시작");`
- `// console.log("[MessageHandler] Redis consumer 0_2 등록 시작");`

#### 디버그 데이터 로그
- `// console.log("sortedProcesses:", JSON.stringify(sortedProcesses, null, 2));`
- `// console.log("currentState:", currentState);`
- `// console.log("[MessageHandler] processData 값:", processData);`

## 로그 확인 방법

### 1. Docker 컨테이너 로그 확인
```bash
# 실시간 로그 확인
docker logs orkis-backend-dev -f

# 최근 100줄 로그 확인
docker logs orkis-backend-dev --tail 100
```

### 2. SQL 질문 처리 시 예상 로그 패턴

```
[MessageHandler] USER_MESSAGE 메시지 수신, sessionId: xxx, tempMessageId: yyy
[MessageHandler] AI 응답 수신 - chat_id: abc123, answer length: 150
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

### 3. General 질문 처리 시 예상 로그 패턴

```
[MessageHandler] USER_MESSAGE 메시지 수신, sessionId: xxx, tempMessageId: yyy
[MessageHandler] AI 응답 수신 - chat_id: def456, answer length: 200
[MessageHandler] 질문 분류: general
[MessageHandler] General 타입 답변 완료 - Redis 스트림 완료
```

## 로그 레벨 가이드

### 프로덕션 환경
- 상태 변경 로그만 유지
- 에러 및 경고 로그 포함
- 디버그 로그 비활성화

### 개발 환경
- 필요시 주석 처리된 로그 활성화 가능
- 세부 디버깅을 위한 추가 로그 삽입 가능

## 문제 진단 체크리스트

### 프로세스가 정상적으로 진행되지 않을 때

1. **프로세스 상태 변경 로그 확인**
   - 각 프로세스가 null → running → completed 순서로 진행되는지 확인
   - 특정 프로세스에서 멈췄는지 확인

2. **AI 서버 응답 확인**
   - chat_id가 정상적으로 수신되었는지 확인
   - 질문 분류가 올바르게 되었는지 확인

3. **Redis 연결 상태 확인**
   - Redis 서버 연결 가능 여부
   - 프로세스 키가 Redis에 존재하는지 확인

### 프론트엔드에서 프로세스가 표시되지 않을 때

1. **WebSocket 연결 상태 확인**
   - 브라우저 개발자 도구에서 WebSocket 연결 확인
   - Network 탭에서 WS 메시지 확인

2. **SQL_STEP 메시지 페이로드 확인**
   - processes 배열이 올바른 형식인지 확인
   - status 값이 문자열("pending", "running", "completed")인지 확인

## 추가 디버깅 팁

### 특정 로그 활성화
```javascript
// 프로세스 데이터 상세 확인이 필요한 경우
console.log("sortedProcesses:", JSON.stringify(sortedProcesses, null, 2));

// Redis 상태 확인이 필요한 경우
console.log("[MessageHandler] 현재 Redis 상태:", currentState);
```

### 로그 필터링
```bash
# SQL 관련 로그만 보기
docker logs orkis-backend-dev -f | grep "sql"

# 프로세스 상태 변경만 보기
docker logs orkis-backend-dev -f | grep "프로세스 상태 변경"

# 에러 로그만 보기
docker logs orkis-backend-dev -f | grep -E "(ERROR|error|Error)"
```

## 결론

로그 정리를 통해 다음과 같은 개선 효과를 달성:

1. **가독성 향상**: 핵심 상태 변경 시점만 로그로 출력
2. **디버깅 효율성**: 문제 발생 시 빠른 원인 파악 가능
3. **성능 개선**: 불필요한 로그 출력 감소로 시스템 부하 감소
4. **유지보수성**: 명확한 로그 패턴으로 시스템 동작 추적 용이