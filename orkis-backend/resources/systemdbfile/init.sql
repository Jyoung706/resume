-- ========================================
-- ORKIS SQLite Schema (converted from PostgreSQL)
-- Generated for desktop local testing
-- ========================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ========================================
-- 01. user_info
-- ========================================
CREATE TABLE IF NOT EXISTS user_info (
    id VARCHAR(50) PRIMARY KEY,
    password VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    login_type VARCHAR(20) NOT NULL,
    user_type VARCHAR(50),
    social_id VARCHAR(100),
    social_provider VARCHAR(20),
    profile_image VARCHAR(500),
    background_image VARCHAR(500),
    question_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    email_verified INTEGER DEFAULT 0,
    email_verified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_info_email ON user_info(email);
CREATE INDEX IF NOT EXISTS idx_user_info_email_verified ON user_info(email_verified);
CREATE INDEX IF NOT EXISTS idx_user_info_login_type ON user_info(login_type);
CREATE INDEX IF NOT EXISTS idx_user_info_social_id ON user_info(social_id);
CREATE INDEX IF NOT EXISTS idx_user_info_social_provider ON user_info(social_provider);

-- ========================================
-- 02. auth_main
-- ========================================
CREATE TABLE IF NOT EXISTS auth_main (
    auth_code VARCHAR(10) PRIMARY KEY,
    auth_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    color_start VARCHAR(20),
    color_end VARCHAR(20),
    visible INTEGER DEFAULT 1,
    selectable INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- 03. auth_license_user
-- ========================================
CREATE TABLE IF NOT EXISTS auth_license_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) NOT NULL,
    auth_code VARCHAR(10) NOT NULL,
    license_code VARCHAR(100) NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    license_state CHAR(1) DEFAULT 'Y',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_auth_license_user_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT fk_auth_license_user_auth_code
        FOREIGN KEY (auth_code) REFERENCES auth_main(auth_code),
    CONSTRAINT chk_auth_license_user_state
        CHECK (license_state IN ('Y', 'N')),
    CONSTRAINT uk_auth_license_user_active
        UNIQUE (user_id, auth_code, license_code)
);

CREATE INDEX IF NOT EXISTS idx_auth_license_user_user_id ON auth_license_user(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_license_user_auth_code ON auth_license_user(auth_code);
CREATE INDEX IF NOT EXISTS idx_auth_license_user_license_code ON auth_license_user(license_code);
CREATE INDEX IF NOT EXISTS idx_auth_license_user_dates ON auth_license_user(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_auth_license_user_state ON auth_license_user(license_state);
CREATE INDEX IF NOT EXISTS idx_auth_license_user_active_search ON auth_license_user(user_id, license_state, start_date, end_date);

-- ========================================
-- 04. menu_info
-- ========================================
CREATE TABLE IF NOT EXISTS menu_info (
    menu_id VARCHAR(50) PRIMARY KEY,
    parent_menu_id VARCHAR(50),
    menu_name VARCHAR(100) NOT NULL,
    menu_path VARCHAR(200),
    menu_icon VARCHAR(50),
    menu_order INTEGER DEFAULT 0,
    is_use CHAR(1) DEFAULT 'Y',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_menu_info_parent
        FOREIGN KEY (parent_menu_id) REFERENCES menu_info(menu_id),
    CONSTRAINT chk_menu_info_is_use
        CHECK (is_use IN ('Y', 'N'))
);

CREATE INDEX IF NOT EXISTS idx_menu_info_order ON menu_info(menu_order);
CREATE INDEX IF NOT EXISTS idx_menu_info_parent ON menu_info(parent_menu_id);

-- ========================================
-- 05. chat_sessions
-- ========================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    message_count INTEGER DEFAULT 0,
    last_message_at TEXT,
    title_modified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_favorite INTEGER DEFAULT 0,

    CONSTRAINT fk_chat_sessions_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_favorite ON chat_sessions(is_favorite DESC, updated_at DESC);

-- ========================================
-- 06. chat_types
-- ========================================
CREATE TABLE IF NOT EXISTS chat_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- 07. code_group
-- ========================================
CREATE TABLE IF NOT EXISTS code_group (
    group_id VARCHAR(50) PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    use_yn CHAR(1) DEFAULT 'Y',
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by VARCHAR(50),
    updated_by VARCHAR(50),

    CONSTRAINT code_group_use_yn_check
        CHECK (use_yn IN ('Y', 'N'))
);

CREATE INDEX IF NOT EXISTS idx_code_group_use_yn ON code_group(use_yn);
CREATE INDEX IF NOT EXISTS idx_code_group_display_order ON code_group(display_order);

-- ========================================
-- 08. code_detail
-- ========================================
CREATE TABLE IF NOT EXISTS code_detail (
    group_id VARCHAR(50) NOT NULL,
    code_id VARCHAR(50) NOT NULL,
    code_name VARCHAR(100) NOT NULL,
    code_name_en VARCHAR(100),
    description TEXT,
    use_yn CHAR(1) DEFAULT 'Y',
    display_order INTEGER DEFAULT 0,
    attr1 VARCHAR(100),
    attr2 VARCHAR(100),
    attr3 VARCHAR(100),
    attr4 VARCHAR(100),
    attr5 VARCHAR(100),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by VARCHAR(50),
    updated_by VARCHAR(50),

    PRIMARY KEY (group_id, code_id),

    CONSTRAINT fk_code_group
        FOREIGN KEY (group_id) REFERENCES code_group(group_id) ON DELETE CASCADE,
    CONSTRAINT code_detail_use_yn_check
        CHECK (use_yn IN ('Y', 'N'))
);

CREATE INDEX IF NOT EXISTS idx_code_detail_use_yn ON code_detail(use_yn);
CREATE INDEX IF NOT EXISTS idx_code_detail_display_order ON code_detail(group_id, display_order);
CREATE INDEX IF NOT EXISTS idx_code_detail_code_id ON code_detail(code_id);
CREATE INDEX IF NOT EXISTS idx_code_detail_code_name ON code_detail(code_name);

-- ========================================
-- 09. language_models
-- ========================================
CREATE TABLE IF NOT EXISTS language_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    description TEXT,
    max_tokens INTEGER,
    temperature REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- 10. db_types
-- ========================================
CREATE TABLE IF NOT EXISTS db_types (
    db_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    default_port INTEGER,
    driver_class VARCHAR(255),
    connection_string_template VARCHAR(500),
    description TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    category VARCHAR(50),
    logo_url TEXT,
    color VARCHAR(7),
    features TEXT,
    use_cases TEXT,
    popularity INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_db_types_type_name ON db_types(type_name);
CREATE INDEX IF NOT EXISTS idx_db_types_is_active ON db_types(is_active);
CREATE INDEX IF NOT EXISTS idx_db_types_category ON db_types(category);
CREATE INDEX IF NOT EXISTS idx_db_types_popularity ON db_types(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_db_types_display_order ON db_types(display_order);

-- ========================================
-- 11. db_connections
-- ========================================
CREATE TABLE IF NOT EXISTS db_connections (
    connection_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) NOT NULL,
    db_type_id INTEGER NOT NULL,
    connection_name VARCHAR(100) NOT NULL,
    description TEXT,
    host VARCHAR(255),
    port INTEGER,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100),
    password_encrypted BLOB,
    file_path VARCHAR(500),
    oracle_sid VARCHAR(100),
    oracle_service_name VARCHAR(100),
    additional_params TEXT,
    min_pool_size INTEGER DEFAULT 1,
    max_pool_size INTEGER DEFAULT 10,
    connection_timeout INTEGER DEFAULT 30,
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    last_tested TEXT,
    last_test_status VARCHAR(20),
    last_test_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_used TEXT,

    CONSTRAINT fk_db_connections_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT fk_db_connections_db_type_id
        FOREIGN KEY (db_type_id) REFERENCES db_types(db_type_id),
    CONSTRAINT unique_user_connection_name
        UNIQUE (user_id, connection_name)
);

CREATE INDEX IF NOT EXISTS idx_db_connections_user_id ON db_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_db_connections_db_type_id ON db_connections(db_type_id);
CREATE INDEX IF NOT EXISTS idx_db_connections_connection_name ON db_connections(connection_name);
CREATE INDEX IF NOT EXISTS idx_db_connections_is_active ON db_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_db_connections_is_default ON db_connections(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_db_connections_last_used ON db_connections(last_used DESC);

-- ========================================
-- 12. help_items
-- ========================================
CREATE TABLE IF NOT EXISTS help_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category_code VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_help_items_category ON help_items(category_code);
CREATE INDEX IF NOT EXISTS idx_help_items_active ON help_items(is_active);
CREATE INDEX IF NOT EXISTS idx_help_items_sort_order ON help_items(sort_order);
DELETE FROM help_items WHERE rowid NOT IN (SELECT MIN(rowid) FROM help_items GROUP BY question);
CREATE UNIQUE INDEX IF NOT EXISTS idx_help_items_question ON help_items(question);

-- ========================================
-- 13. notices
-- ========================================
CREATE TABLE IF NOT EXISTS notices (
    notice_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'notice',
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON notices(is_active);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_display_order ON notices(display_order DESC);
DELETE FROM notices WHERE rowid NOT IN (SELECT MIN(rowid) FROM notices GROUP BY title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notices_title ON notices(title);

-- ========================================
-- 14. user_notification_reads
-- ========================================
CREATE TABLE IF NOT EXISTS user_notification_reads (
    read_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(50) NOT NULL,
    notice_id TEXT NOT NULL,
    read_at TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT uk_user_notice
        UNIQUE (user_id, notice_id),
    CONSTRAINT fk_user_notification_notice_id
        FOREIGN KEY (notice_id) REFERENCES notices(notice_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user_id ON user_notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_notice_id ON user_notification_reads(notice_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_read_at ON user_notification_reads(read_at DESC);

-- ========================================
-- 15. support_tickets
-- ========================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status_code VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority_code VARCHAR(50) DEFAULT 'NORMAL',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    has_answer INTEGER DEFAULT 0,
    answer TEXT,
    answered_by VARCHAR(50),
    answered_by_name VARCHAR(100),
    answered_at TEXT,
    attachments TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    view_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_id, status_code);

-- ========================================
-- 16. keywords
-- ========================================
CREATE TABLE IF NOT EXISTS keywords (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    text VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'custom',
    category VARCHAR(50),
    user_id VARCHAR(50),
    knowledge_base_id VARCHAR(100),
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT fk_keywords_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_type ON keywords(type);
CREATE INDEX IF NOT EXISTS idx_keywords_category ON keywords(category);
CREATE INDEX IF NOT EXISTS idx_keywords_knowledge_base_id ON keywords(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_keywords_usage_count ON keywords(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_created_at ON keywords(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_type_usage ON keywords(type, usage_count DESC);
DELETE FROM keywords WHERE rowid NOT IN (SELECT MIN(rowid) FROM keywords GROUP BY text, type, COALESCE(user_id, ''));
CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_text_type ON keywords(text, type, COALESCE(user_id, ''));

-- ========================================
-- 17. user_keyword_favorites
-- ========================================
CREATE TABLE IF NOT EXISTS user_keyword_favorites (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(50) NOT NULL,
    keyword_id TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT fk_user_keyword_favorites_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_keyword_favorites_keyword_id
        FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_keyword_favorites
        UNIQUE (user_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_user_keyword_favorites_user_id ON user_keyword_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keyword_favorites_keyword_id ON user_keyword_favorites(keyword_id);
CREATE INDEX IF NOT EXISTS idx_user_keyword_favorites_usage ON user_keyword_favorites(user_id, usage_count DESC);

-- ========================================
-- 18. recommended_questions
-- ========================================
CREATE TABLE IF NOT EXISTS recommended_questions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    question_no VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    icon_path VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recommended_questions_category ON recommended_questions(category);
CREATE INDEX IF NOT EXISTS idx_recommended_questions_type ON recommended_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_recommended_questions_active ON recommended_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_recommended_questions_sort_order ON recommended_questions(sort_order);
DELETE FROM recommended_questions WHERE rowid NOT IN (SELECT MIN(rowid) FROM recommended_questions GROUP BY question_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recommended_questions_no ON recommended_questions(question_no);

-- ========================================
-- 19. llm_provider
-- ========================================
CREATE TABLE IF NOT EXISTS llm_provider (
    provider_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    website VARCHAR(255),
    api_docs VARCHAR(255),
    logo_filename VARCHAR(255),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_available INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT chk_llm_provider_name
        CHECK (provider_name != '')
);

CREATE INDEX IF NOT EXISTS idx_llm_provider_name ON llm_provider(provider_name);

-- ========================================
-- 20. llm_available_models
-- ========================================
CREATE TABLE IF NOT EXISTS llm_available_models (
    model_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_identifier VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    context_window INTEGER,
    max_output_tokens INTEGER,
    capabilities TEXT,
    pricing_input VARCHAR(100),
    pricing_output VARCHAR(100),
    license VARCHAR(100),
    architecture VARCHAR(100),
    release_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_llm_available_models_provider
        FOREIGN KEY (provider_id) REFERENCES llm_provider(provider_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT unique_llm_available_models_identifier
        UNIQUE (provider_id, model_identifier),
    CONSTRAINT chk_llm_available_models_name
        CHECK (model_name != ''),
    CONSTRAINT chk_llm_available_models_context_window
        CHECK (context_window IS NULL OR context_window > 0),
    CONSTRAINT chk_llm_available_models_max_output_tokens
        CHECK (max_output_tokens IS NULL OR max_output_tokens > 0)
);

CREATE INDEX IF NOT EXISTS idx_llm_available_models_provider ON llm_available_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_llm_available_models_name ON llm_available_models(model_name);
CREATE INDEX IF NOT EXISTS idx_llm_available_models_identifier ON llm_available_models(model_identifier);
CREATE INDEX IF NOT EXISTS idx_llm_available_models_active ON llm_available_models(is_active);

-- ========================================
-- 21. llm_user_models
-- ========================================
CREATE TABLE IF NOT EXISTS llm_user_models (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(255) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    api_endpoint VARCHAR(500) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    api_version VARCHAR(20),
    parameters TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    connection_status VARCHAR(20) DEFAULT 'unknown',
    last_tested_at TEXT,
    last_error TEXT,
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_llm_user_models_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_model_name_user_models
        UNIQUE (user_id, model_name)
);

CREATE INDEX IF NOT EXISTS idx_llm_user_models_user_id ON llm_user_models(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_user_models_provider ON llm_user_models(provider);

-- ========================================
-- 22. llm_connection_logs
-- ========================================
CREATE TABLE IF NOT EXISTS llm_connection_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    llm_model_id TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    test_result VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_llm_connection_logs_model
        FOREIGN KEY (llm_model_id) REFERENCES llm_user_models(id) ON DELETE CASCADE,
    CONSTRAINT fk_llm_connection_logs_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_llm_connection_logs_model ON llm_connection_logs(llm_model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_connection_logs_user ON llm_connection_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_connection_logs_result ON llm_connection_logs(test_result, created_at DESC);

-- ========================================
-- 23. rag_preprocessing_history
-- ========================================
CREATE TABLE IF NOT EXISTS rag_preprocessing_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id INTEGER NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    rag_type INTEGER NOT NULL DEFAULT 0,
    db_type INTEGER NOT NULL DEFAULT 3,
    db_id VARCHAR(100) NOT NULL,
    api_key VARCHAR(255),
    request_url TEXT,
    request_payload TEXT,
    response_status INTEGER,
    response_body TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    request_started_at TEXT DEFAULT (datetime('now')),
    request_completed_at TEXT,
    processing_duration_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_rag_preprocessing_connection_id
        FOREIGN KEY (connection_id) REFERENCES db_connections(connection_id) ON DELETE CASCADE,
    CONSTRAINT fk_rag_preprocessing_user_id
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rag_preprocessing_connection_id ON rag_preprocessing_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_rag_preprocessing_user_id ON rag_preprocessing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_preprocessing_status ON rag_preprocessing_history(status);
CREATE INDEX IF NOT EXISTS idx_rag_preprocessing_request_type ON rag_preprocessing_history(request_type);
CREATE INDEX IF NOT EXISTS idx_rag_preprocessing_created_at ON rag_preprocessing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_preprocessing_db_id ON rag_preprocessing_history(db_id);

-- ========================================
-- 24. email_verification_tokens
-- ========================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(50) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_email_verification_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_used_at ON email_verification_tokens(used_at);

-- ========================================
-- 25. password_reset_tokens
-- ========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(50) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at ON password_reset_tokens(used_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_ip ON password_reset_tokens(ip_address, created_at);

-- ========================================
-- 26. rate_limit_logs
-- ========================================
CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    request_type VARCHAR(50) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT unique_rate_limit_entry
        UNIQUE (request_type, identifier, created_at)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_type_identifier ON rate_limit_logs(request_type, identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip ON rate_limit_logs(ip_address, created_at DESC);

-- ========================================
-- 27. security_audit_logs
-- ========================================
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id VARCHAR(50),
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    CONSTRAINT fk_security_audit_user
        FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip ON security_audit_logs(ip_address, created_at DESC);

-- ========================================
-- 28. schema_versions
-- ========================================
CREATE TABLE IF NOT EXISTS schema_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    applied_at TEXT DEFAULT (datetime('now'))
);
DELETE FROM schema_versions WHERE rowid NOT IN (SELECT MIN(rowid) FROM schema_versions GROUP BY version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_versions_version ON schema_versions(version);

-- ========================================
-- 29. faq_items
--   cloud: src/db_schema/29_faq_items(new).sql (2026-04-14)
--   PG: UUID + BOOLEAN + TIMESTAMP + trigger → TEXT + INTEGER + TEXT, trigger 제거 (DAO 책임)
-- ========================================
CREATE TABLE IF NOT EXISTS faq_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category_code VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category_code);
CREATE INDEX IF NOT EXISTS idx_faq_items_active ON faq_items(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_pinned ON faq_items(is_pinned);
CREATE INDEX IF NOT EXISTS idx_faq_items_sort_order ON faq_items(sort_order);

-- ========================================
-- 31. server_health
--   cloud: src/db_schema/31_server_health.sql (2026-05-22)
--   PG: TIMESTAMP WITH TIME ZONE + BOOLEAN + trigger → TEXT + INTEGER, trigger 제거 (DAO 책임)
--   service_type 별 1 row (PK). 'rag' / 'llm' 두 도메인.
-- ========================================
CREATE TABLE IF NOT EXISTS server_health (
    service_type     VARCHAR(20) NOT NULL,
    preprocessing    VARCHAR(20),
    ai_server_status INTEGER,
    last_updated_at  TEXT,
    last_error       TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

    CONSTRAINT pk_server_health PRIMARY KEY (service_type),
    CONSTRAINT chk_server_health_service_type
        CHECK (service_type IN ('rag', 'llm')),
    CONSTRAINT chk_server_health_preprocessing
        CHECK (preprocessing IS NULL
               OR preprocessing IN ('idle', 'in_progress', 'done'))
);

-- ========================================
-- INITIAL DATA
-- ========================================

-- 90. auth_main
INSERT OR IGNORE INTO auth_main
(auth_code, auth_name, description, icon, color_start, color_end, visible, selectable, created_at, updated_at)
VALUES
('1', '일반 모드', '일반사용자 권한', 'G', '#3182CE', '#2C5AA0', 1, 1, '2025-09-23 18:16:29.276', '2025-09-23 18:16:29.276'),
('2', '프로 모드', '프로사용자 권한', 'P', '#805AD5', '#553C9A', 1, 0, '2025-09-23 18:16:29.276', '2025-09-23 18:16:29.276'),
('3', '관리자 모드', '시스템 관리자 권한', 'A', '#E53E3E', '#C53030', 0, 0, '2025-09-23 18:16:29.276', '2025-09-23 18:16:29.276');

-- 92. code_group
INSERT OR IGNORE INTO code_group (group_id, group_name, description, display_order, use_yn) VALUES
('TICKET_STATUS', '문의 상태', '고객 문의 티켓 처리 상태 코드', 1, 'Y'),
('TICKET_PRIORITY', '문의 우선순위', '고객 문의 티켓 우선순위 코드', 2, 'Y'),
('TICKET_CATEGORY', '문의 카테고리', '고객 문의 유형 분류 코드', 3, 'Y'),
('HELP_CATEGORY', '도움말 카테고리', '도움말 시스템 카테고리 분류 코드', 4, 'Y'),
('KEYWORD_CATEGORY', '키워드 카테고리', '키워드 힌트 카테고리 분류 코드', 5, 'Y'),
('LOGIN_TYPE', '로그인 타입', '로그인 방식 분류 코드', 6, 'Y'),
('USER_TYPE', '사용자 타입', '사용자 유형 분류 코드', 7, 'Y'),
('CHAT_TYPE', '채팅 타입', '채팅 유형 분류 코드', 8, 'Y');

-- 92. code_detail - TICKET_STATUS
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, attr1, use_yn) VALUES
('TICKET_STATUS', 'PENDING', '대기중', 'Pending', 1, '#FFA726', 'Y'),
('TICKET_STATUS', 'IN_PROGRESS', '처리중', 'In Progress', 2, '#42A5F5', 'Y'),
('TICKET_STATUS', 'COMPLETED', '완료', 'Completed', 3, '#66BB6A', 'Y'),
('TICKET_STATUS', 'CANCELLED', '취소', 'Cancelled', 4, '#EF5350', 'Y');

-- 92. code_detail - TICKET_PRIORITY
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, attr1, use_yn) VALUES
('TICKET_PRIORITY', 'LOW', '낮음', 'Low', 1, '#9E9E9E', 'Y'),
('TICKET_PRIORITY', 'NORMAL', '보통', 'Normal', 2, '#42A5F5', 'Y'),
('TICKET_PRIORITY', 'HIGH', '높음', 'High', 3, '#FFA726', 'Y'),
('TICKET_PRIORITY', 'URGENT', '긴급', 'Urgent', 4, '#EF5350', 'Y');

-- 92. code_detail - TICKET_CATEGORY
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('TICKET_CATEGORY', 'FUNCTION', '기능 문의', 'Function Inquiry', 1, 'Y'),
('TICKET_CATEGORY', 'BUG', '버그 신고', 'Bug Report', 2, 'Y'),
('TICKET_CATEGORY', 'IMPROVEMENT', '개선 제안', 'Improvement Suggestion', 3, 'Y'),
('TICKET_CATEGORY', 'ETC', '기타', 'Etc', 4, 'Y');

-- 92. code_detail - HELP_CATEGORY
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('HELP_CATEGORY', 'account', '계정관리', 'Account', 1, 'Y'),
('HELP_CATEGORY', 'usage', '이용방법', 'Usage', 2, 'Y'),
('HELP_CATEGORY', 'payment', '결제방법', 'Payment', 3, 'Y'),
('HELP_CATEGORY', 'profile', '프로필 설정', 'Profile', 4, 'Y'),
('HELP_CATEGORY', 'notification', '알림설정', 'Notification', 5, 'Y'),
('HELP_CATEGORY', 'event', '이벤트', 'Event', 6, 'Y');

-- 92. code_detail - KEYWORD_CATEGORY
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('KEYWORD_CATEGORY', 'general', '일반', 'General', 1, 'Y'),
('KEYWORD_CATEGORY', 'finance', '금융', 'Finance', 2, 'Y'),
('KEYWORD_CATEGORY', 'aml', '자금세탁방지', 'AML', 3, 'Y'),
('KEYWORD_CATEGORY', 'compliance', '컴플라이언스', 'Compliance', 4, 'Y'),
('KEYWORD_CATEGORY', 'risk', '리스크', 'Risk', 5, 'Y'),
('KEYWORD_CATEGORY', 'customer', '고객', 'Customer', 6, 'Y'),
('KEYWORD_CATEGORY', 'transaction', '거래', 'Transaction', 7, 'Y'),
('KEYWORD_CATEGORY', 'reporting', '보고', 'Reporting', 8, 'Y');

-- 92. code_detail - LOGIN_TYPE
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('LOGIN_TYPE', 'local', '로컬 로그인', 'Local Login', 1, 'Y'),
('LOGIN_TYPE', 'kakao', '카카오 로그인', 'Kakao Login', 2, 'Y'),
('LOGIN_TYPE', 'naver', '네이버 로그인', 'Naver Login', 3, 'Y'),
('LOGIN_TYPE', 'google', '구글 로그인', 'Google Login', 4, 'Y');

-- 92. code_detail - USER_TYPE
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('USER_TYPE', 'local', '일반 사용자', 'Local User', 1, 'Y'),
('USER_TYPE', 'social', '소셜 사용자', 'Social User', 2, 'Y'),
('USER_TYPE', 'admin', '관리자', 'Administrator', 3, 'Y');

-- 92. code_detail - CHAT_TYPE
INSERT OR IGNORE INTO code_detail (group_id, code_id, code_name, code_name_en, display_order, use_yn) VALUES
('CHAT_TYPE', 'general', '일반 대화', 'General Chat', 1, 'Y'),
('CHAT_TYPE', 'sql', 'SQL 쿼리', 'SQL Query', 2, 'Y'),
('CHAT_TYPE', 'data', '데이터 분석', 'Data Analysis', 3, 'Y'),
('CHAT_TYPE', 'code', '코딩 지원', 'Coding Support', 4, 'Y');

-- 93. db_types
INSERT OR IGNORE INTO db_types
(db_type_id, type_name, display_name, default_port, driver_class, connection_string_template, description, is_active, created_at, updated_at, category, logo_url, color, features, use_cases, popularity, display_order)
VALUES
(1, 'PostgreSQL', 'PostgreSQL', 5432, 'org.postgresql.Driver', 'jdbc:postgresql://{host}:{port}/{database}', 'PostgreSQL 데이터베이스', 1, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/postgresql.png', '#336791', '["복잡한 쿼리", "JSONB 지원", "확장성", "ACID 준수"]', '["복잡한 애플리케이션", "지리정보 시스템", "분석"]', 90, 2),
(2, 'MySQL', 'MySQL', 3306, 'com.mysql.cj.jdbc.Driver', 'jdbc:mysql://{host}:{port}/{database}?useSSL=false&serverTimezone=UTC', 'MySQL/MariaDB 데이터베이스', 0, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/mysql.png', '#00758F', '["ACID 준수", "복제 지원", "높은 성능", "안정성"]', '["웹 애플리케이션", "E-commerce", "CMS"]', 95, 3),
(5, 'SQLite', 'SQLite', NULL, 'org.sqlite.JDBC', 'jdbc:sqlite:{file_path}', 'SQLite 파일 기반 데이터베이스', 1, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/sqlite.gif', '#003B57', '["서버리스", "제로 설정", "작은 용량", "자체 포함"]', '["모바일 앱", "데스크톱 앱", "임베디드 시스템", "브라우저"]', 92, 1),
(4, 'Oracle', 'Oracle Database', 1521, 'oracle.jdbc.OracleDriver', 'jdbc:oracle:thin:@{host}:{port}:{sid}', 'Oracle 데이터베이스', 0, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/oracle.svg', '#F80000', '["고가용성", "보안", "엔터프라이즈 기능", "파티셔닝"]', '["대기업", "금융", "정부기관"]', 80, 6),
(3, 'MSSQL', 'Microsoft SQL Server', 1433, 'com.microsoft.sqlserver.jdbc.SQLServerDriver', 'jdbc:sqlserver://{host}:{port};databaseName={database}', 'Microsoft SQL Server', 0, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/mssql.svg', '#CC2927', '["Windows 통합", "BI 도구", "고성능", "보안"]', '[".NET 애플리케이션", "엔터프라이즈", "BI"]', 75, 7),
(6, 'MariaDB', 'MariaDB', 3306, 'org.mariadb.jdbc.Driver', 'jdbc:mariadb://{host}:{port}/{database}', 'MariaDB 데이터베이스', 0, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'Relational', '/assets/db-icon/mariadb.svg', '#003545', '["MySQL 호환", "고성능", "오픈소스", "확장성"]', '["웹 애플리케이션", "클라우드", "데이터 웨어하우스"]', 70, 14),
(7, 'MongoDB', 'MongoDB', 27017, 'mongodb.jdbc.MongoDriver', 'mongodb://{host}:{port}/{database}', 'MongoDB NoSQL 데이터베이스', 0, '2025-10-24 14:32:02.166', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/mongodb.svg', '#47A248', '["스키마 없음", "수평 확장", "실시간 분석", "유연성"]', '["실시간 앱", "콘텐츠 관리", "IoT"]', 88, 4),
(8, 'Redis', 'Redis', 6379, 'redis.clients.jedis.JedisDriver', 'redis://{host}:{port}', '인메모리 데이터 구조 저장소', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/redis.svg', '#DC382D', '["인메모리", "캐싱", "Pub/Sub", "높은 성능"]', '["캐싱", "세션 관리", "실시간 분석"]', 85, 5),
(9, 'Cassandra', 'Cassandra', 9042, 'com.datastax.driver.core.Cluster', 'cassandra://{host}:{port}/{keyspace}', '분산형 NoSQL 데이터베이스', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/cassandra.svg', '#1287B1', '["분산형", "고가용성", "확장성", "복제"]', '["대용량 데이터", "시계열 데이터", "추천 시스템"]', 70, 8),
(10, 'DynamoDB', 'DynamoDB', NULL, 'com.amazonaws.services.dynamodbv2.AmazonDynamoDB', 'dynamodb://{region}', 'AWS의 완전 관리형 NoSQL 데이터베이스', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/dynamodb.svg', '#4053D6', '["서버리스", "자동 확장", "완전 관리형", "글로벌 테이블"]', '["서버리스 앱", "모바일 앱", "게임"]', 72, 9),
(11, 'Firebase', 'Firebase', NULL, NULL, 'firebase://{project_id}', 'Google의 실시간 NoSQL 클라우드 데이터베이스', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'NoSQL', '/assets/db-icon/firebase.svg', '#FFCA28', '["실시간 동기화", "오프라인 지원", "자동 확장", "인증"]', '["모바일 앱", "실시간 앱", "프로토타입"]', 78, 10),
(12, 'Elasticsearch', 'Elasticsearch', 9200, 'org.elasticsearch.client.RestHighLevelClient', 'http://{host}:{port}', '분산형 검색 및 분석 엔진', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'Search', '/assets/db-icon/elasticsearch.svg', '#005571', '["전문 검색", "실시간 분석", "RESTful API", "분산형"]', '["검색 엔진", "로그 분석", "모니터링"]', 82, 11),
(13, 'Neo4j', 'Neo4j', 7687, 'org.neo4j.driver.Driver', 'bolt://{host}:{port}', '그래프 데이터베이스', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'Graph', '/assets/db-icon/neo4j.svg', '#008CC1', '["그래프 모델", "Cypher 쿼리", "관계 분석", "ACID"]', '["소셜 네트워크", "추천 엔진", "지식 그래프"]', 65, 12),
(14, 'InfluxDB', 'InfluxDB', 8086, 'com.influxdb.client.InfluxDBClient', 'http://{host}:{port}', '시계열 데이터베이스', 0, '2025-11-04 17:26:06.676', '2025-11-14 17:32:45.462', 'Time-Series', '/assets/db-icon/influxdb.svg', '#22ADF6', '["시계열 최적화", "고성능 쓰기", "다운샘플링", "SQL-like"]', '["IoT", "모니터링", "실시간 분석"]', 68, 13);

-- 94. llm_provider
INSERT OR IGNORE INTO llm_provider (provider_name, website, api_docs, logo_filename) VALUES
('OpenAI', 'https://openai.com', 'https://platform.openai.com/docs', 'openai.png');

-- 94. llm_available_models (OpenAI)
INSERT OR IGNORE INTO llm_available_models (
    provider_id, model_name, model_identifier, version,
    context_window, max_output_tokens, capabilities,
    pricing_input, pricing_output, release_date
) VALUES
((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-5', 'gpt-5', 'gpt-5-2025-01-01', 200000, 32768,
 '["text", "vision", "audio", "code"]', '$5.00 per 1M tokens', '$20.00 per 1M tokens', '2025-01-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-5 Mini', 'gpt-5-mini', 'gpt-5-mini-2025-01-01', 200000, 32768,
 '["text", "vision", "audio"]', '$1.00 per 1M tokens', '$4.00 per 1M tokens', '2025-01-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-5 Nano', 'gpt-5-nano', 'gpt-5-nano-2025-01-01', 128000, 16384,
 '["text", "vision"]', '$0.20 per 1M tokens', '$0.80 per 1M tokens', '2025-01-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-4o', 'gpt-4o', 'gpt-4o-2024-11-20', 128000, 16384,
 '["text", "vision", "audio"]', '$2.50 per 1M tokens', '$10.00 per 1M tokens', '2024-05-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-4o Mini', 'gpt-4o-mini', 'gpt-4o-mini-2024-07-18', 128000, 16384,
 '["text", "vision", "audio"]', '$0.15 per 1M tokens', '$0.60 per 1M tokens', '2024-07-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-4', 'gpt-4', 'gpt-4-0613', 8192, 8192,
 '["text"]', '$30.00 per 1M tokens', '$60.00 per 1M tokens', '2023-06-01'),

((SELECT provider_id FROM llm_provider WHERE provider_name = 'OpenAI'),
 'GPT-3.5 Turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-0125', 16385, 4096,
 '["text"]', '$0.50 per 1M tokens', '$1.50 per 1M tokens', '2024-01-01');

-- 95. keywords
INSERT OR IGNORE INTO keywords (text, type, category, user_id, knowledge_base_id, usage_count) VALUES
('자금세탁방지', 'recommended', 'aml', NULL, 'kb-finance-aml', 125),
('고객확인제도', 'recommended', 'aml', NULL, 'kb-finance-aml', 98),
('의심거래보고', 'recommended', 'reporting', NULL, 'kb-finance-aml', 87),
('KYC', 'recommended', 'compliance', NULL, 'kb-finance-aml', 156),
('고위험고객', 'recommended', 'risk', NULL, 'kb-finance-aml', 134),
('FATF 권고안', 'recommended', 'compliance', NULL, 'kb-finance-aml', 92),
('금융정보분석원', 'recommended', 'reporting', NULL, 'kb-finance-aml', 67),
('정치적 주요인물', 'recommended', 'customer', NULL, 'kb-finance-aml', 78),
('PEP', 'recommended', 'customer', NULL, 'kb-finance-aml', 143),
('고액현금거래보고', 'recommended', 'reporting', NULL, 'kb-finance-aml', 95),
('거래모니터링', 'frequent', 'transaction', NULL, 'kb-finance-aml', 203),
('실소유자', 'frequent', 'customer', NULL, 'kb-finance-aml', 178),
('위험평가', 'frequent', 'risk', NULL, 'kb-finance-aml', 145),
('STR', 'frequent', 'reporting', NULL, 'kb-finance-aml', 189),
('CTR', 'frequent', 'reporting', NULL, 'kb-finance-aml', 167),
('고객실사', 'recommended', 'compliance', NULL, 'kb-finance-aml', 112),
('단순화된 실사', 'recommended', 'compliance', NULL, 'kb-finance-aml', 65),
('강화된 실사', 'recommended', 'compliance', NULL, 'kb-finance-aml', 89),
('거래목적 확인', 'recommended', 'transaction', NULL, 'kb-finance-aml', 76),
('자금출처 확인', 'recommended', 'transaction', NULL, 'kb-finance-aml', 94),
('제재대상자', 'recommended', 'compliance', NULL, 'kb-finance-aml', 88),
('블랙리스트', 'recommended', 'risk', NULL, 'kb-finance-aml', 71),
('화이트리스트', 'recommended', 'risk', NULL, 'kb-finance-aml', 52),
('명단 대조', 'recommended', 'compliance', NULL, 'kb-finance-aml', 103),
('경제 제재', 'recommended', 'compliance', NULL, 'kb-finance-aml', 79),
('이상거래탐지', 'frequent', 'transaction', NULL, 'kb-finance-aml', 134),
('현금거래', 'recommended', 'transaction', NULL, 'kb-finance-aml', 98),
('외환거래', 'recommended', 'transaction', NULL, 'kb-finance-aml', 87),
('자금이체', 'recommended', 'transaction', NULL, 'kb-finance-aml', 102),
('송금', 'recommended', 'transaction', NULL, 'kb-finance-aml', 117),
('위험기반 접근법', 'recommended', 'risk', NULL, 'kb-finance-aml', 91),
('고위험국가', 'recommended', 'risk', NULL, 'kb-finance-aml', 106),
('고위험업종', 'recommended', 'risk', NULL, 'kb-finance-aml', 84),
('리스크평가', 'frequent', 'risk', NULL, 'kb-finance-aml', 127),
('특정금융거래정보', 'recommended', 'reporting', NULL, 'kb-finance-aml', 73),
('FIU', 'recommended', 'reporting', NULL, 'kb-finance-aml', 82),
('의무보고', 'recommended', 'reporting', NULL, 'kb-finance-aml', 69),
('보고시한', 'recommended', 'reporting', NULL, 'kb-finance-aml', 58),
('금융기관', 'recommended', 'finance', NULL, 'kb-finance-aml', 95),
('은행', 'recommended', 'finance', NULL, 'kb-finance-aml', 108),
('증권', 'recommended', 'finance', NULL, 'kb-finance-aml', 76),
('보험', 'recommended', 'finance', NULL, 'kb-finance-aml', 64),
('가상자산', 'frequent', 'finance', NULL, 'kb-finance-aml', 142),
('법인고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 89),
('개인고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 97),
('신규고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 85),
('기존고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 71),
('비대면고객', 'recommended', 'customer', NULL, 'kb-finance-aml', 103);

-- 96. help_items
INSERT OR IGNORE INTO help_items (category_code, question, answer, sort_order, is_active) VALUES
('usage', '새로운 채팅창을 만드려면 어떻게 하나요?', '좌측메뉴 최근채팅 옆에 있는 ''+'' 버튼을 클락하시면 새로운 대화창을 만드실 수 있습니다.', 1, 1),
('usage', '대화창에서 오래된 채팅이 보이지 않습니다.', '기본적으로 최근 100개의 메시지만 표시됩니다. 이전 대화를 보시려면 스크롤을 위로 올리거나 "더 보기" 버튼을 클릭하세요.', 2, 1),
('usage', 'SQL 쿼리 결과를 내보내기 할 수 있나요?', '채팅 메뉴의 내보내기 버튼을 클릭하면 JSON, CSV, Excel 등 다양한 형식으로 쿼리 결과를 다운로드할 수 있습니다.', 3, 1),
('account', '특정한 대화를 삭제하고 싶습니다.', '대화 목록에서 삭제하고 싶은 대화에 마우스를 올리면 나타나는 삭제 아이콘을 클릭하거나, 대화 내에서 설정 메뉴를 통해 삭제할 수 있습니다.', 4, 1),
('account', '비밀번호를 변경하고 싶습니다.', '설정 > 계정 보안에서 현재 비밀번호를 입력한 후 새 비밀번호를 설정할 수 있습니다. 비밀번호는 8자 이상이어야 합니다.', 5, 1),
('account', '계정을 탈퇴하고 싶습니다.', '설정 > 계정 관리 > 계정 탈퇴에서 탈퇴를 요청할 수 있습니다. 탈퇴 시 모든 대화 기록과 설정이 삭제됩니다.', 6, 1),
('payment', '토큰을 1년 안에 사용하지 못하면 어떻게 되나요?', '구매하신 토큰은 구매일로부터 1년간 유효하며, 유효기간이 지나면 자동으로 소멸됩니다. 소멸 예정인 토큰은 30일 전부터 알림을 받으실 수 있습니다.', 7, 1),
('payment', '결제 내역을 확인하고 싶습니다.', '설정 > 결제 관리에서 그동안의 모든 결제 내역과 토큰 사용 이력을 확인할 수 있습니다.', 8, 1),
('profile', '프로필 사진을 변경하려면 어떻게 하나요?', '설정 메뉴에서 프로필 설정을 선택한 후, 프로필 사진을 클릭하여 새로운 이미지를 업로드할 수 있습니다.', 9, 1),
('profile', '표시 이름을 변경하고 싶습니다.', '설정 > 프로필에서 표시 이름을 자유롭게 변경할 수 있습니다. 변경된 이름은 즉시 반영됩니다.', 10, 1),
('notification', '알림을 끄려면 어떻게 하나요?', '설정 > 알림 설정에서 각종 알림을 개별적으로 켜거나 끌 수 있습니다.', 11, 1),
('notification', '특정 채팅방만 알림을 끄고 싶습니다.', '해당 채팅방에서 설정 아이콘을 클릭한 후 "알림 끄기"를 선택하면 해당 채팅방의 알림만 비활성화됩니다.', 12, 1),
('event', '현재 진행 중인 이벤트는 무엇인가요?', '신규 가입자 대상 첫 달 50% 할인 이벤트가 진행 중입니다. 자세한 내용은 이벤트 페이지를 확인해주세요.', 13, 1),
('event', '이벤트 쿠폰을 적용하려면 어떻게 하나요?', '결제 화면에서 쿠폰 코드 입력란에 이벤트 코드를 입력하면 할인이 자동으로 적용됩니다.', 14, 1);

-- 97. notices
INSERT OR IGNORE INTO notices (notice_id, title, content, type, author_id, author_name, is_active, display_order) VALUES
(lower(hex(randomblob(16))),
 '[공지] ORKIS 시스템에 오신 것을 환영합니다',
 '<p>ORKIS 시스템에 오신 것을 환영합니다.</p><p>본 시스템은 AI 기반 데이터 분석 및 대화형 SQL 쿼리를 지원합니다.</p>',
 'notice', 'system', '시스템 관리자', 1, 100),
(lower(hex(randomblob(16))),
 '[업데이트] v1.0.0 릴리즈 안내',
 '<p>ORKIS v1.0.0이 릴리즈 되었습니다.</p><p>채팅 기반 SQL 쿼리, 실시간 스트리밍, 다중 세션 관리 등을 지원합니다.</p>',
 'update', 'system', '시스템 관리자', 1, 90),
(lower(hex(randomblob(16))),
 '[안내] 개인정보 처리방침 업데이트',
 '<p>개인정보 처리방침이 업데이트 되었습니다.</p>',
 'notice', 'system', '시스템 관리자', 1, 80),
(lower(hex(randomblob(16))),
 '[점검] 정기 시스템 점검 안내',
 '<p>시스템 안정화 및 성능 개선을 위한 정기 점검이 예정되어 있습니다.</p><p>매주 일요일 새벽 2:00 ~ 4:00 (약 2시간)</p>',
 'maintenance', 'system', '시스템 관리자', 1, 70);

-- 98. recommended_questions
INSERT OR IGNORE INTO recommended_questions (question_no, question, category, question_type, sort_order, is_active) VALUES
('NO.101', '요즘 우리나라에 왜 대폭우가 많이 내릴까?', 'Knowledge', 'general', 1, 1),
('NO.102', '인공지능과 머신러닝의 차이점이 무엇인가요?', 'Knowledge', 'general', 2, 1),
('NO.103', '양자컴퓨터가 기존 컴퓨터와 다른 점은?', 'Knowledge', 'general', 3, 1),
('NO.104', 'ESG 경영이란 무엇인가요?', 'Knowledge', 'general', 4, 1),
('NO.201', '내 사진을 지브리 스타일의 이미지로 생성해줘', 'Image', 'general', 5, 1),
('NO.202', '귀여운 고양이 캐릭터 일러스트를 그려줘', 'Image', 'general', 6, 1),
('NO.203', '미래 도시 배경 이미지를 생성해줘', 'Image', 'general', 7, 1),
('NO.301', '아이폰 13 이상에서 동작하는 가계부 앱을 파이썬을 이용해서 만들어줘', 'Coding', 'general', 8, 1),
('NO.302', 'React로 할 일 관리 앱을 만들어줘', 'Coding', 'general', 9, 1),
('NO.303', 'TypeScript로 REST API 서버를 만들어줘', 'Coding', 'general', 10, 1),
('NO.304', 'Python으로 웹 스크래퍼를 작성해줘', 'Coding', 'general', 11, 1),
('NO.401', '2024년 매출 데이터를 분석해줘', 'Data', 'data', 12, 1),
('NO.402', '고객 데이터에서 패턴을 찾아줘', 'Data', 'data', 13, 1),
('NO.403', 'CSV 파일을 JSON으로 변환해줘', 'Data', 'data', 14, 1),
('NO.404', '시계열 데이터의 트렌드를 분석해줘', 'Data', 'data', 15, 1),
('NO.501', '사용자 테이블에서 최근 가입자 10명을 조회해줘', 'SQL', 'sql', 16, 1),
('NO.502', '월별 매출 통계를 집계하는 쿼리를 작성해줘', 'SQL', 'sql', 17, 1),
('NO.503', '중복된 이메일 주소를 찾는 쿼리를 만들어줘', 'SQL', 'sql', 18, 1),
('NO.504', '주문 테이블과 고객 테이블을 조인해서 분석해줘', 'SQL', 'sql', 19, 1),
('NO.505', '최근 30일간 활성 사용자 수를 계산해줘', 'SQL', 'sql', 20, 1),
('NO.601', '자금세탁방지(AML) 규정에 대해 설명해줘', 'Finance', 'finance', 21, 1),
('NO.602', 'KYC 프로세스를 분석해줘', 'Finance', 'finance', 22, 1),
('NO.603', '이상거래 탐지 기준을 알려줘', 'Finance', 'finance', 23, 1);

-- 99. language_models (legacy)
INSERT OR IGNORE INTO language_models (model_name, provider, description, max_tokens, temperature, is_active) VALUES
('GPT-4o', 'OpenAI', '최신 GPT-4 멀티모달 모델 (텍스트, 비전, 오디오)', 128000, 0.7, 1),
('GPT-4o Mini', 'OpenAI', 'GPT-4o의 경량화 버전', 128000, 0.7, 1),
('GPT-4', 'OpenAI', '고성능 대규모 언어 모델', 8192, 0.7, 1),
('GPT-3.5 Turbo', 'OpenAI', '빠르고 효율적인 대화형 AI 모델', 16385, 0.7, 1),
('Claude 3.5 Sonnet', 'Anthropic', 'Anthropic의 최신 고성능 모델', 200000, 0.7, 1),
('Claude 3 Opus', 'Anthropic', 'Anthropic의 가장 강력한 모델', 200000, 0.7, 1),
('Claude 3 Haiku', 'Anthropic', 'Anthropic의 빠른 응답 모델', 200000, 0.7, 1),
('Gemini 1.5 Pro', 'Google', 'Google의 멀티모달 AI 모델', 2000000, 0.7, 1),
('Gemini 1.5 Flash', 'Google', 'Gemini 1.5의 빠른 버전', 1000000, 0.7, 1),
('ORKIS SQL', 'ORKIS', 'SQL 쿼리 생성에 최적화된 커스텀 모델', 16384, 0.3, 1);

-- 30. faq_items seed
--   cloud: src/db_schema/30_initial_data_faq(new).sql (FUNCTION 5 / BUG 3 / IMPROVEMENT 2 / ETC 4 = 14 건)
--   PG: true/false → 1/0
INSERT OR IGNORE INTO faq_items (category_code, question, answer, is_pinned, sort_order, is_active) VALUES
('FUNCTION', 'AI 채팅은 어떻게 사용하나요?', 'AI 채팅은 좌측 메뉴에서 새로운 대화를 생성한 후, 하단 입력창에 질문을 입력하면 됩니다. 데이터베이스를 연결하면 SQL 생성, 데이터 분석 등 더 정확한 답변을 받을 수 있습니다.', 1, 1, 1),
('FUNCTION', '데이터베이스 연결은 어떻게 하나요?', '우측 패널의 DB 연결 메뉴에서 데이터베이스 타입을 선택하고 호스트, 포트, 사용자명, 비밀번호 등의 접속 정보를 입력하면 됩니다. 연결 테스트 버튼으로 정상 접속 여부를 확인할 수 있습니다.', 1, 2, 1),
('FUNCTION', 'SQL 쿼리 결과를 내보내기 할 수 있나요?', '채팅에서 생성된 SQL 결과는 내보내기 버튼을 통해 CSV, JSON, Excel 등 다양한 형식으로 다운로드할 수 있습니다. 결과 테이블 상단의 내보내기 아이콘을 클릭하세요.', 0, 3, 1),
('FUNCTION', '스키마 선택 기능은 무엇인가요?', '스키마 선택 패널에서 AI가 참조할 테이블과 컬럼을 직접 선택할 수 있습니다. 필요한 테이블만 선택하면 AI가 해당 스키마 정보를 기반으로 더 정확한 SQL을 생성합니다.', 0, 4, 1),
('FUNCTION', '대화 내역을 삭제하려면 어떻게 하나요?', '좌측 대화 목록에서 삭제하려는 대화에 마우스를 올리면 나타나는 삭제 아이콘을 클릭하세요. 삭제된 대화는 복구할 수 없으니 주의해 주세요.', 0, 5, 1),
('BUG', 'AI 응답이 중간에 멈추는 경우 어떻게 하나요?', '네트워크 불안정이나 서버 부하로 인해 응답이 지연될 수 있습니다. 잠시 기다린 후에도 응답이 없으면 페이지를 새로고침하고 다시 질문해 주세요. 문제가 지속되면 고객센터로 문의해 주세요.', 0, 6, 1),
('BUG', '데이터베이스 연결이 자주 끊어집니다.', '연결 타임아웃 설정을 확인해 주세요. 장시간 미사용 시 연결이 자동으로 종료될 수 있습니다. 연결 설정에서 Keep-Alive 옵션을 활성화하거나, 방화벽/VPN 설정을 확인해 주세요.', 0, 7, 1),
('BUG', '차트나 그래프가 표시되지 않습니다.', '브라우저의 JavaScript가 활성화되어 있는지 확인해 주세요. Chrome, Edge 등 최신 브라우저 사용을 권장합니다. 브라우저 캐시를 삭제하거나 시크릿 모드에서 시도해 보세요.', 0, 8, 1),
('IMPROVEMENT', '새로운 데이터베이스 타입 지원을 요청하고 싶습니다.', '현재 지원하지 않는 데이터베이스에 대한 지원 요청은 고객센터의 문의하기를 통해 접수해 주세요. 카테고리를 "개선요청"으로 선택하고 원하시는 데이터베이스 종류와 사용 환경을 상세히 기재해 주시면 검토 후 반영하겠습니다.', 0, 9, 1),
('IMPROVEMENT', '기능 개선 요청은 어떻게 하나요?', '고객센터의 "문의하기" 메뉴에서 카테고리를 "개선요청"으로 선택하여 원하시는 기능을 상세히 설명해 주세요. 접수된 요청은 내부 검토를 거쳐 향후 업데이트에 반영됩니다. 문의 내역에서 진행 상황을 확인하실 수 있습니다.', 0, 10, 1),
('ETC', '고객센터 운영 시간은 어떻게 되나요?', '고객센터는 평일 09:00 ~ 18:00에 운영되며, 주말 및 공휴일은 휴무입니다. 문의하기를 통해 접수된 문의는 운영 시간 내에 순차적으로 답변 드립니다.', 1, 11, 1),
('ETC', '비밀번호를 잊어버렸습니다.', '로그인 화면의 "비밀번호 찾기"를 클릭한 후 가입 시 등록한 이메일을 입력하면 비밀번호 재설정 링크가 발송됩니다. 이메일이 도착하지 않으면 스팸함을 확인해 주세요.', 0, 12, 1),
('ETC', '계정 정보를 변경하고 싶습니다.', '설정 메뉴의 프로필 관리에서 이름, 이메일, 비밀번호 등의 계정 정보를 변경할 수 있습니다. 이메일 변경 시 인증 절차가 필요합니다.', 0, 13, 1),
('ETC', '서비스 이용 약관은 어디서 확인할 수 있나요?', '로그인 화면 하단 또는 설정 메뉴의 "약관 및 정책"에서 서비스 이용 약관, 개인정보 처리방침 등을 확인할 수 있습니다.', 0, 14, 1);

-- 32. server_health seed
--   cloud: src/db_schema/32_initial_data_server_health.sql (2026-05-22)
--   "jobs 가 healthy 측정을 마쳤다는 가정" 의 픽스처. ON CONFLICT DO NOTHING 으로 멱등.
INSERT OR IGNORE INTO server_health
    (service_type, preprocessing, ai_server_status, last_updated_at)
VALUES
    ('rag', 'done', 1, datetime('now')),
    ('llm', NULL,  1, datetime('now'));

-- 92. Views
CREATE VIEW IF NOT EXISTS v_ticket_status AS
SELECT code_id, code_name, code_name_en, display_order, attr1 as color
FROM code_detail WHERE group_id = 'TICKET_STATUS' AND use_yn = 'Y'
ORDER BY display_order;

CREATE VIEW IF NOT EXISTS v_ticket_priority AS
SELECT code_id, code_name, code_name_en, display_order, attr1 as color
FROM code_detail WHERE group_id = 'TICKET_PRIORITY' AND use_yn = 'Y'
ORDER BY display_order;

CREATE VIEW IF NOT EXISTS v_ticket_category AS
SELECT code_id, code_name, code_name_en, display_order
FROM code_detail WHERE group_id = 'TICKET_CATEGORY' AND use_yn = 'Y'
ORDER BY display_order;

CREATE VIEW IF NOT EXISTS v_keyword_category AS
SELECT code_id, code_name, code_name_en, display_order
FROM code_detail WHERE group_id = 'KEYWORD_CATEGORY' AND use_yn = 'Y'
ORDER BY display_order;

-- Schema version
INSERT OR IGNORE INTO schema_versions (version, description) VALUES ('1.0.0', 'Initial SQLite schema for desktop');
INSERT OR IGNORE INTO schema_versions (version, description) VALUES ('1.1.0', 'Add faq_items + server_health (cloud schema 29~32 sync)');
