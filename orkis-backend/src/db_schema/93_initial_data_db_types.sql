-- ========================================
-- DB 타입 초기 데이터 삽입 스크립트
-- 최종 수정: 2026-01-15 (실제 PostgreSQL 스키마 기준)
-- 참고: 실제 DB의 db_types 테이블 컬럼 구조에 맞춤
-- ========================================

-- ========================================
-- DB 타입 초기 데이터 (db_types)
-- 실제 DB 컬럼: db_type_id, type_name, display_name, category, logo_url, color, features, use_cases, popularity, is_active
-- ========================================

INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(1, 'PostgreSQL', 'PostgreSQL', 5432, 'org.postgresql.Driver', 'jdbc:postgresql://{host}:{port}/{database}', 'PostgreSQL 데이터베이스', true, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/postgresql.png', '#336791', '["복잡한 쿼리", "JSONB 지원", "확장성", "ACID 준수"]'::jsonb, '["복잡한 애플리케이션", "지리정보 시스템", "분석"]'::jsonb, 90, 2);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(2, 'MySQL', 'MySQL', 3306, 'com.mysql.cj.jdbc.Driver', 'jdbc:mysql://{host}:{port}/{database}?useSSL=false&serverTimezone=UTC', 'MySQL/MariaDB 데이터베이스', true, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/mysql.png', '#00758F', '["ACID 준수", "복제 지원", "높은 성능", "안정성"]'::jsonb, '["웹 애플리케이션", "E-commerce", "CMS"]'::jsonb, 95, 3);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(5, 'SQLite', 'SQLite', NULL, 'org.sqlite.JDBC', 'jdbc:sqlite:{file_path}', 'SQLite 파일 기반 데이터베이스', true, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/sqlite.gif', '#003B57', '["서버리스", "제로 설정", "작은 용량", "자체 포함"]'::jsonb, '["모바일 앱", "데스크톱 앱", "임베디드 시스템", "브라우저"]'::jsonb, 92, 1);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(4, 'Oracle', 'Oracle Database', 1521, 'oracle.jdbc.OracleDriver', 'jdbc:oracle:thin:@{host}:{port}:{sid}', 'Oracle 데이터베이스', false, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/oracle.svg', '#F80000', '["고가용성", "보안", "엔터프라이즈 기능", "파티셔닝"]'::jsonb, '["대기업", "금융", "정부기관"]'::jsonb, 80, 6);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(3, 'MSSQL', 'Microsoft SQL Server', 1433, 'com.microsoft.sqlserver.jdbc.SQLServerDriver', 'jdbc:sqlserver://{host}:{port};databaseName={database}', 'Microsoft SQL Server', false, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/mssql.svg', '#CC2927', '["Windows 통합", "BI 도구", "고성능", "보안"]'::jsonb, '[".NET 애플리케이션", "엔터프라이즈", "BI"]'::jsonb, 75, 7);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(6, 'MariaDB', 'MariaDB', 3306, 'org.mariadb.jdbc.Driver', 'jdbc:mariadb://{host}:{port}/{database}', 'MariaDB 데이터베이스', true, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/mariadb.svg', '#003545', '["MySQL 호환", "고성능", "오픈소스", "확장성"]'::jsonb, '["웹 애플리케이션", "클라우드", "데이터 웨어하우스"]'::jsonb, 70, 14);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(7, 'MongoDB', 'MongoDB', 27017, 'mongodb.jdbc.MongoDriver', 'mongodb://{host}:{port}/{database}', 'MongoDB NoSQL 데이터베이스', false, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/mongodb.svg', '#47A248', '["스키마 없음", "수평 확장", "실시간 분석", "유연성"]'::jsonb, '["실시간 앱", "콘텐츠 관리", "IoT"]'::jsonb, 88, 4);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(8, 'Redis', 'Redis', 6379, 'redis.clients.jedis.JedisDriver', 'redis://{host}:{port}', '인메모리 데이터 구조 저장소', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/redis.svg', '#DC382D', '["인메모리", "캐싱", "Pub/Sub", "높은 성능"]'::jsonb, '["캐싱", "세션 관리", "실시간 분석"]'::jsonb, 85, 5);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(9, 'Cassandra', 'Cassandra', 9042, 'com.datastax.driver.core.Cluster', 'cassandra://{host}:{port}/{keyspace}', '분산형 NoSQL 데이터베이스', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/cassandra.svg', '#1287B1', '["분산형", "고가용성", "확장성", "복제"]'::jsonb, '["대용량 데이터", "시계열 데이터", "추천 시스템"]'::jsonb, 70, 8);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(10, 'DynamoDB', 'DynamoDB', NULL, 'com.amazonaws.services.dynamodbv2.AmazonDynamoDB', 'dynamodb://{region}', 'AWS의 완전 관리형 NoSQL 데이터베이스', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/dynamodb.svg', '#4053D6', '["서버리스", "자동 확장", "완전 관리형", "글로벌 테이블"]'::jsonb, '["서버리스 앱", "모바일 앱", "게임"]'::jsonb, 72, 9);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(11, 'Firebase', 'Firebase', NULL, NULL, 'firebase://{project_id}', 'Google의 실시간 NoSQL 클라우드 데이터베이스', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/firebase.svg', '#FFCA28', '["실시간 동기화", "오프라인 지원", "자동 확장", "인증"]'::jsonb, '["모바일 앱", "실시간 앱", "프로토타입"]'::jsonb, 78, 10);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(12, 'Elasticsearch', 'Elasticsearch', 9200, 'org.elasticsearch.client.RestHighLevelClient', 'http://{host}:{port}', '분산형 검색 및 분석 엔진', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'Search', '/assets/db-icon/elasticsearch.svg', '#005571', '["전문 검색", "실시간 분석", "RESTful API", "분산형"]'::jsonb, '["검색 엔진", "로그 분석", "모니터링"]'::jsonb, 82, 11);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(13, 'Neo4j', 'Neo4j', 7687, 'org.neo4j.driver.Driver', 'bolt://{host}:{port}', '그래프 데이터베이스', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'Graph', '/assets/db-icon/neo4j.svg', '#008CC1', '["그래프 모델", "Cypher 쿼리", "관계 분석", "ACID"]'::jsonb, '["소셜 네트워크", "추천 엔진", "지식 그래프"]'::jsonb, 65, 12);
INSERT INTO public.db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES(14, 'InfluxDB', 'InfluxDB', 8086, 'com.influxdb.client.InfluxDBClient', 'http://{host}:{port}', '시계열 데이터베이스', false, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'Time-Series', '/assets/db-icon/influxdb.svg', '#22ADF6', '["시계열 최적화", "고성능 쓰기", "다운샘플링", "SQL-like"]'::jsonb, '["IoT", "모니터링", "실시간 분석"]'::jsonb, 68, 13);

