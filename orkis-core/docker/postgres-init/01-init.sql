-- 메인 DB: 사용자 + 사용자별 외부 MariaDB 접속 정보 저장

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL UNIQUE,
    email       VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_db_connections (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    db_type       VARCHAR(16) NOT NULL,
    host          VARCHAR(128) NOT NULL,
    port          INTEGER NOT NULL,
    database_name VARCHAR(64) NOT NULL,
    db_user       VARCHAR(64) NOT NULL,
    db_password   VARCHAR(128) NOT NULL
);

INSERT INTO users (username, email) VALUES
    ('alice', 'alice@orkis.dev'),
    ('bob',   'bob@orkis.dev')
ON CONFLICT (username) DO NOTHING;

-- 두 유저 모두 같은 MariaDB 인스턴스의 같은 DB 를 사용한다는 가정.
-- orkis-core 는 host machine 에서 yarn dev 로 실행되므로 host = 'localhost'.
INSERT INTO user_db_connections (user_id, db_type, host, port, database_name, db_user, db_password)
SELECT u.id, 'mariadb', 'localhost', 3306, 'tenant_a', 'tenant_user', 'tenant_pass'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_db_connections c WHERE c.user_id = u.id
);
