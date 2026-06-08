-- 사용자 데이터: LLM Text-to-SQL 의 대상이 되는 비즈니스 데이터

USE tenant_a;

CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64) NOT NULL,
    category    VARCHAR(32) NOT NULL,
    price       DECIMAL(10, 2) NOT NULL,
    stock       INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    customer    VARCHAR(64) NOT NULL,
    product_id  INT NOT NULL,
    quantity    INT NOT NULL,
    total       DECIMAL(10, 2) NOT NULL,
    ordered_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO products (name, category, price, stock) VALUES
    ('Mechanical Keyboard',     'electronics', 129.00, 25),
    ('Wireless Mouse',          'electronics',  39.50, 80),
    ('USB-C Hub',               'electronics',  49.00, 50),
    ('Standing Desk',           'furniture',   349.00,  8),
    ('Ergonomic Chair',         'furniture',   459.00, 12),
    ('Notebook (A5)',           'stationery',    7.50, 200),
    ('Fountain Pen',            'stationery',   28.00, 45);

INSERT INTO orders (customer, product_id, quantity, total) VALUES
    ('alice', 1, 1, 129.00),
    ('alice', 2, 2,  79.00),
    ('bob',   4, 1, 349.00),
    ('bob',   6, 5,  37.50),
    ('alice', 7, 3,  84.00);

-- tenant_user 가 read 가능하도록 권한 보장
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_a.* TO 'tenant_user'@'%';
FLUSH PRIVILEGES;
