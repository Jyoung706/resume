-- ========================================
-- 공지사항 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- ========================================

BEGIN;

-- ========================================
-- 공지사항 데이터 삽입 (notices)
-- ========================================

INSERT INTO notices (
    notice_id, title, content, type,
    author_id, author_name, is_active, display_order
) VALUES
-- 시스템 공지사항
(
    gen_random_uuid(),
    '[공지] ORKIS 시스템에 오신 것을 환영합니다',
    '<p>ORKIS 시스템에 오신 것을 환영합니다.</p>
<p>본 시스템은 AI 기반 데이터 분석 및 대화형 SQL 쿼리를 지원합니다.</p>
<ul>
  <li>자연어로 데이터베이스 쿼리 작성</li>
  <li>실시간 스트리밍 응답</li>
  <li>다양한 데이터베이스 연결 지원</li>
</ul>
<p>궁금하신 사항이 있으시면 우측 상단의 고객 지원 버튼을 클릭하여 도움을 받으실 수 있습니다.</p>',
    'notice',
    'system',
    '시스템 관리자',
    true,
    100
),
-- 업데이트 공지
(
    gen_random_uuid(),
    '[업데이트] v1.0.0 릴리즈 안내',
    '<p>ORKIS v1.0.0이 릴리즈 되었습니다.</p>
<h4>주요 기능</h4>
<ul>
  <li>채팅 기반 SQL 쿼리 기능</li>
  <li>실시간 스트리밍 응답</li>
  <li>다중 채팅 세션 관리</li>
  <li>공지사항/알림 시스템</li>
  <li>다양한 LLM 모델 지원 (OpenAI, Anthropic, Google)</li>
</ul>
<h4>지원 데이터베이스</h4>
<ul>
  <li>PostgreSQL</li>
  <li>MySQL / MariaDB</li>
  <li>SQLite</li>
  <li>Microsoft SQL Server</li>
</ul>
<p>자세한 내용은 릴리즈 노트를 확인해주세요.</p>',
    'update',
    'system',
    '시스템 관리자',
    true,
    90
),
-- 개인정보 공지
(
    gen_random_uuid(),
    '[안내] 개인정보 처리방침 업데이트',
    '<p>개인정보 처리방침이 업데이트 되었습니다.</p>
<h4>주요 변경사항</h4>
<ul>
  <li>개인정보 수집 항목 명확화</li>
  <li>데이터 보관 기간 안내</li>
  <li>제3자 제공 내역 추가</li>
  <li>사용자 권리 안내 강화</li>
</ul>
<p>변경된 개인정보 처리방침은 즉시 적용됩니다.</p>
<p><a href="/privacy-policy">개인정보 처리방침 전문 보기</a></p>',
    'notice',
    'system',
    '시스템 관리자',
    true,
    80
),
-- 점검 공지
(
    gen_random_uuid(),
    '[점검] 정기 시스템 점검 안내',
    '<p>시스템 안정화 및 성능 개선을 위한 정기 점검이 예정되어 있습니다.</p>
<h4>점검 일시</h4>
<p>매주 일요일 새벽 2:00 ~ 4:00 (약 2시간)</p>
<h4>점검 내용</h4>
<ul>
  <li>데이터베이스 최적화</li>
  <li>보안 패치 적용</li>
  <li>시스템 모니터링 강화</li>
</ul>
<p>점검 시간 동안 서비스 이용이 제한될 수 있습니다. 양해 부탁드립니다.</p>',
    'maintenance',
    'system',
    '시스템 관리자',
    true,
    70
);

COMMIT;

-- 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '공지사항 초기 데이터 삽입 완료';
    RAISE NOTICE '- 시스템 공지(notice): 2개';
    RAISE NOTICE '- 업데이트(update): 1개';
    RAISE NOTICE '- 점검(maintenance): 1개';
END $$;
