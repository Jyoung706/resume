# ORKIS Database Schema

PostgreSQL 데이터베이스 스키마 정의 파일

## 파일 구조

### 테이블 스키마 (01-30)

| 파일명 | 테이블명 | 설명 |
|--------|----------|------|
| 01_user_info.sql | user_info | 사용자 정보 |
| 02_auth_main.sql | auth_main | 권한 메인 |
| 03_auth_license_user.sql | auth_license_user | 사용자 라이선스 |
| 04_menu_info.sql | menu_info | 메뉴 정보 |
| 05_chat_sessions.sql | chat_sessions | 채팅 세션 |
| 06_chat_types.sql | chat_types | 채팅 타입 |
| 07_code_group.sql | code_group | 공통코드 그룹 |
| 08_code_detail.sql | code_detail | 공통코드 상세 |
| 09_language_models.sql | language_models | 언어 모델 |
| 10_db_types.sql | db_types | DB 타입 |
| 11_db_connections.sql | db_connections | DB 연결 정보 |
| 12_help_items.sql | help_items | 도움말 항목 |
| 13_notices.sql | notices | 공지사항 |
| 14_user_notification_reads.sql | user_notification_reads | 알림 읽음 상태 |
| 15_support_tickets.sql | support_tickets | 고객 문의 |
| 16_keywords.sql | keywords | 키워드 |
| 17_user_keyword_favorites.sql | user_keyword_favorites | 키워드 즐겨찾기 |
| 18_recommended_questions.sql | recommended_questions | 추천 질문 |
| 19_llm_provider.sql | llm_provider | LLM 제공자 |
| 20_llm_available_models.sql | llm_available_models | LLM 모델 카탈로그 |
| 21_llm_user_models.sql | llm_user_models | 사용자 LLM 모델 |
| 22_llm_connection_logs.sql | llm_connection_logs | LLM 연결 로그 |
| 23_rag_preprocessing_history.sql | rag_preprocessing_history | RAG 전처리 이력 |
| 24_email_verification_tokens.sql | email_verification_tokens | 이메일 인증 토큰 |
| 25_password_reset_tokens.sql | password_reset_tokens | 비밀번호 재설정 토큰 |
| 26_rate_limit_logs.sql | rate_limit_logs | 요청 제한 로그 |
| 27_security_audit_logs.sql | security_audit_logs | 보안 감사 로그 |
| 28_schema_versions.sql | schema_versions | 스키마 버전 |

### 뷰 및 함수 (50-59)

| 파일명 | 설명 |
|--------|------|
| 50_views.sql | 공통 뷰 정의 |
| 51_functions.sql | 공통 함수 정의 |

### 초기 데이터 (90-99)

| 파일명 | 설명 |
|--------|------|
| 90_initial_data_user_auth.sql | 사용자 및 권한 초기 데이터 |
| 91_initial_data_menu.sql | 메뉴 초기 데이터 |
| 92_initial_data_code.sql | 공통코드 초기 데이터 |
| 93_initial_data_db_types.sql | DB 타입 초기 데이터 |
| 94_initial_data_llm.sql | LLM 제공자/모델 초기 데이터 |
| 95_initial_data_keywords.sql | 키워드 초기 데이터 |
| 96_initial_data_help.sql | 도움말 초기 데이터 |
| 97_initial_data_notices.sql | 공지사항 초기 데이터 |
| 98_initial_data_recommended_questions.sql | 추천 질문 초기 데이터 |
| 99_initial_data_language_models.sql | 언어 모델 초기 데이터 (레거시) |

## 실행 순서

1. 테이블 생성: 01 ~ 28 순서대로 실행
2. 뷰 및 함수: 50 ~ 51 실행
3. 초기 데이터: 90 ~ 98 순서대로 실행

## 주의사항

- 외래키 제약 조건으로 인해 파일 순서대로 실행해야 합니다
- 초기 데이터 실행 전 테이블이 모두 생성되어 있어야 합니다
- 운영 환경에서는 초기 데이터 중 테스트 데이터를 제거해야 합니다

## 최종 수정일

2026-01-15 (실제 PostgreSQL 스키마 기준으로 재생성)
