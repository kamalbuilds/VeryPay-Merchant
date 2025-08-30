# VeryPay Database Schema Design

## 1. Database Architecture Overview

VeryPay uses a hybrid approach combining PostgreSQL for structured relational data with Redis for caching and session management. The schema is designed for ACID compliance, performance, and scalability with proper indexing and partitioning strategies.

## 2. Database Selection Rationale

### 2.1 PostgreSQL (Primary Database)
- **ACID Compliance**: Critical for financial transactions
- **JSON Support**: Flexible schema for metadata and dynamic fields
- **Advanced Indexing**: GIN, GiST, and B-tree indexes for performance
- **Partitioning**: Built-in table partitioning for large datasets
- **Full-Text Search**: Built-in search capabilities
- **Extensibility**: Support for custom data types and functions

### 2.2 Redis (Cache & Session Store)
- **High Performance**: In-memory operations with microsecond latency
- **Data Structures**: Rich data types (strings, hashes, sets, sorted sets)
- **Pub/Sub**: Real-time notifications and messaging
- **Session Management**: Distributed session storage
- **Rate Limiting**: Built-in sliding window algorithms

## 3. Core Tables Schema

### 3.1 Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    profile_image_url TEXT,
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (
        verification_status IN ('unverified', 'pending', 'verified', 'rejected')
    ),
    kyc_data JSONB,
    reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 1000),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_wallet_address ON users (wallet_address);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_verification_status ON users (verification_status);
CREATE INDEX idx_users_reputation_score ON users (reputation_score DESC);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Merchants Table
```sql
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(200) NOT NULL,
    business_description TEXT,
    business_category VARCHAR(100) NOT NULL,
    business_type VARCHAR(50) NOT NULL CHECK (
        business_type IN ('individual', 'sole_proprietorship', 'partnership', 'corporation', 'llc')
    ),
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(50),
    website_url TEXT,
    logo_url TEXT,
    banner_url TEXT,
    business_address JSONB, -- Structured address object
    contact_info JSONB, -- Phone, email, etc.
    business_hours JSONB, -- Operating hours
    payment_settings JSONB DEFAULT '{}', -- Accepted tokens, fees, etc.
    api_credentials JSONB, -- Encrypted API keys and webhooks
    verification_documents JSONB, -- Document URLs and metadata
    compliance_status VARCHAR(20) DEFAULT 'pending' CHECK (
        compliance_status IN ('pending', 'approved', 'rejected', 'suspended')
    ),
    risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
    monthly_volume_limit DECIMAL(20, 2) DEFAULT 10000.00,
    transaction_count INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 2) DEFAULT 0.00,
    total_fees_paid DECIMAL(20, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_merchants_user_id ON merchants (user_id);
CREATE INDEX idx_merchants_business_category ON merchants (business_category);
CREATE INDEX idx_merchants_compliance_status ON merchants (compliance_status);
CREATE INDEX idx_merchants_risk_score ON merchants (risk_score);
CREATE INDEX idx_merchants_total_volume ON merchants (total_volume DESC);
CREATE INDEX idx_merchants_created_at ON merchants (created_at DESC);
CREATE INDEX idx_merchants_is_active ON merchants (is_active);

-- Full-text search index
CREATE INDEX idx_merchants_search ON merchants USING gin(
    to_tsvector('english', business_name || ' ' || COALESCE(business_description, ''))
);

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 Transactions Table (Partitioned)
```sql
-- Parent table for partitioning
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blockchain_tx_hash VARCHAR(66) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    customer_wallet_address VARCHAR(42) NOT NULL,
    payment_intent_id UUID,
    order_id VARCHAR(100),
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    token_decimals INTEGER NOT NULL DEFAULT 18,
    amount_requested DECIMAL(40, 18) NOT NULL,
    amount_paid DECIMAL(40, 18) NOT NULL,
    amount_refunded DECIMAL(40, 18) DEFAULT 0,
    platform_fee DECIMAL(40, 18) DEFAULT 0,
    gas_fee DECIMAL(40, 18),
    exchange_rate DECIMAL(20, 8), -- Rate at time of transaction
    fiat_currency VARCHAR(3),
    fiat_amount DECIMAL(20, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'failed', 'refunded', 'disputed')
    ),
    confirmation_count INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 3,
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- Custom data from merchant
    payment_method VARCHAR(50) DEFAULT 'wallet', -- wallet, qr_code, link
    expires_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE transactions_2024_01 PARTITION OF transactions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_2024_02 PARTITION OF transactions
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue creating partitions as needed...

-- Indexes on partitioned table
CREATE INDEX idx_transactions_merchant_id ON transactions (merchant_id, created_at DESC);
CREATE INDEX idx_transactions_customer_wallet ON transactions (customer_wallet_address);
CREATE INDEX idx_transactions_blockchain_hash ON transactions (blockchain_tx_hash);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_token_address ON transactions (token_address);
CREATE INDEX idx_transactions_amount ON transactions (amount_paid DESC);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX idx_transactions_order_id ON transactions (order_id) WHERE order_id IS NOT NULL;

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.4 Payment Intents Table
```sql
CREATE TABLE payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    customer_wallet_address VARCHAR(42),
    order_id VARCHAR(100),
    description TEXT,
    amount DECIMAL(40, 18) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (
        status IN ('created', 'pending', 'completed', 'failed', 'expired', 'cancelled')
    ),
    payment_link VARCHAR(255) UNIQUE,
    qr_code_data TEXT,
    metadata JSONB DEFAULT '{}',
    success_url TEXT,
    cancel_url TEXT,
    webhook_url TEXT,
    auto_capture BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payment_intents_merchant_id ON payment_intents (merchant_id, created_at DESC);
CREATE INDEX idx_payment_intents_status ON payment_intents (status);
CREATE INDEX idx_payment_intents_payment_link ON payment_intents (payment_link);
CREATE INDEX idx_payment_intents_expires_at ON payment_intents (expires_at);
CREATE INDEX idx_payment_intents_order_id ON payment_intents (order_id) WHERE order_id IS NOT NULL;

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.5 Rewards Table
```sql
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    transaction_id UUID REFERENCES transactions(id),
    reward_type VARCHAR(20) NOT NULL CHECK (
        reward_type IN ('transaction', 'volume_milestone', 'referral', 'loyalty', 'governance')
    ),
    reward_program_id UUID,
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    amount DECIMAL(40, 18) NOT NULL,
    multiplier DECIMAL(4, 2) DEFAULT 1.0,
    tier VARCHAR(20) DEFAULT 'bronze',
    calculation_method VARCHAR(50),
    calculation_params JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'distributed', 'claimed', 'expired', 'cancelled')
    ),
    distribution_tx_hash VARCHAR(66),
    claim_tx_hash VARCHAR(66),
    expires_at TIMESTAMP WITH TIME ZONE,
    distributed_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_rewards_merchant_id ON rewards (merchant_id, created_at DESC);
CREATE INDEX idx_rewards_transaction_id ON rewards (transaction_id);
CREATE INDEX idx_rewards_status ON rewards (status);
CREATE INDEX idx_rewards_reward_type ON rewards (reward_type);
CREATE INDEX idx_rewards_expires_at ON rewards (expires_at);
CREATE INDEX idx_rewards_amount ON rewards (amount DESC);

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.6 API Keys Table
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key
    key_prefix VARCHAR(20) NOT NULL, -- First few characters for identification
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permissions
    rate_limit_requests INTEGER DEFAULT 1000,
    rate_limit_window_seconds INTEGER DEFAULT 3600,
    allowed_origins JSONB, -- Array of allowed domains
    allowed_ips JSONB, -- Array of allowed IP addresses
    webhook_url TEXT,
    webhook_events JSONB DEFAULT '[]',
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_api_keys_merchant_id ON api_keys (merchant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys (is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys (expires_at);

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.7 Analytics Tables
```sql
-- Daily aggregated analytics
CREATE TABLE merchant_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    date DATE NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    total_volume DECIMAL(20, 2) DEFAULT 0.00,
    total_fees DECIMAL(20, 2) DEFAULT 0.00,
    total_rewards DECIMAL(20, 2) DEFAULT 0.00,
    unique_customers INTEGER DEFAULT 0,
    average_transaction_value DECIMAL(20, 2) DEFAULT 0.00,
    top_payment_token VARCHAR(20),
    conversion_rate DECIMAL(5, 2) DEFAULT 0.00,
    refund_rate DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(merchant_id, date)
);

-- Indexes
CREATE INDEX idx_merchant_analytics_daily_merchant_date ON merchant_analytics_daily (merchant_id, date DESC);
CREATE INDEX idx_merchant_analytics_daily_date ON merchant_analytics_daily (date DESC);
CREATE INDEX idx_merchant_analytics_daily_volume ON merchant_analytics_daily (total_volume DESC);

CREATE TRIGGER update_merchant_analytics_daily_updated_at BEFORE UPDATE ON merchant_analytics_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Token analytics
CREATE TABLE token_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    total_volume DECIMAL(40, 18) DEFAULT 0,
    unique_merchants INTEGER DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    average_transaction_value DECIMAL(40, 18) DEFAULT 0,
    price_usd DECIMAL(20, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(token_address, date)
);

CREATE INDEX idx_token_analytics_token_date ON token_analytics (token_address, date DESC);
CREATE INDEX idx_token_analytics_date ON token_analytics (date DESC);
```

### 3.8 Audit Log Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- users, merchants, transactions, etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, etc.
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(20) DEFAULT 'user', -- user, system, admin
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Monthly partitions for audit logs
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
```

## 4. Supporting Tables

### 4.1 Token Registry
```sql
CREATE TABLE supported_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(42) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    decimals INTEGER NOT NULL,
    chain_id INTEGER NOT NULL,
    logo_url TEXT,
    is_stablecoin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    min_payment_amount DECIMAL(40, 18) DEFAULT 0,
    max_payment_amount DECIMAL(40, 18),
    platform_fee_rate DECIMAL(6, 4) DEFAULT 0.0250, -- 2.5%
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supported_tokens_chain_id ON supported_tokens (chain_id);
CREATE INDEX idx_supported_tokens_symbol ON supported_tokens (symbol);
CREATE INDEX idx_supported_tokens_is_active ON supported_tokens (is_active);

CREATE TRIGGER update_supported_tokens_updated_at BEFORE UPDATE ON supported_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Settings Table
```sql
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_category ON system_settings (category);

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.3 Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_expires_at ON notifications (expires_at);
```

## 5. Database Views

### 5.1 Merchant Summary View
```sql
CREATE VIEW merchant_summary AS
SELECT 
    m.id,
    m.business_name,
    m.business_category,
    m.compliance_status,
    m.is_active,
    m.created_at,
    COALESCE(stats.transaction_count, 0) as total_transactions,
    COALESCE(stats.total_volume, 0) as total_volume,
    COALESCE(stats.successful_transactions, 0) as successful_transactions,
    CASE 
        WHEN stats.transaction_count > 0 
        THEN ROUND((stats.successful_transactions::decimal / stats.transaction_count * 100), 2)
        ELSE 0 
    END as success_rate,
    COALESCE(rewards.total_rewards, 0) as total_rewards_earned
FROM merchants m
LEFT JOIN (
    SELECT 
        merchant_id,
        COUNT(*) as transaction_count,
        SUM(amount_paid) as total_volume,
        COUNT(*) FILTER (WHERE status = 'confirmed') as successful_transactions
    FROM transactions 
    GROUP BY merchant_id
) stats ON m.id = stats.merchant_id
LEFT JOIN (
    SELECT 
        merchant_id,
        SUM(amount) as total_rewards
    FROM rewards 
    WHERE status IN ('distributed', 'claimed')
    GROUP BY merchant_id
) rewards ON m.id = rewards.merchant_id;
```

### 5.2 Transaction Analytics View
```sql
CREATE VIEW transaction_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'confirmed') as successful_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
    SUM(amount_paid) FILTER (WHERE status = 'confirmed') as total_volume,
    AVG(amount_paid) FILTER (WHERE status = 'confirmed') as avg_transaction_value,
    COUNT(DISTINCT merchant_id) as active_merchants,
    COUNT(DISTINCT customer_wallet_address) as unique_customers
FROM transactions
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 6. Database Functions and Triggers

### 6.1 Update Merchant Statistics Function
```sql
CREATE OR REPLACE FUNCTION update_merchant_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update merchant statistics when transaction is confirmed
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        UPDATE merchants 
        SET 
            transaction_count = transaction_count + 1,
            total_volume = total_volume + NEW.amount_paid,
            total_fees_paid = total_fees_paid + NEW.platform_fee,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.merchant_id;
        
        -- Insert or update daily analytics
        INSERT INTO merchant_analytics_daily (
            merchant_id, date, transaction_count, successful_transactions, total_volume, total_fees
        )
        VALUES (
            NEW.merchant_id, 
            DATE(NEW.created_at), 
            1, 
            1, 
            NEW.amount_paid, 
            NEW.platform_fee
        )
        ON CONFLICT (merchant_id, date) 
        DO UPDATE SET
            transaction_count = merchant_analytics_daily.transaction_count + 1,
            successful_transactions = merchant_analytics_daily.successful_transactions + 1,
            total_volume = merchant_analytics_daily.total_volume + NEW.amount_paid,
            total_fees = merchant_analytics_daily.total_fees + NEW.platform_fee,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_merchant_stats_trigger
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_stats();
```

### 6.2 Audit Log Trigger
```sql
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        metadata
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply to key tables
CREATE TRIGGER audit_merchants_trigger
    AFTER INSERT OR UPDATE OR DELETE ON merchants
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_transactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();
```

## 7. Redis Schema Design

### 7.1 Cache Patterns

#### Session Storage
```redis
# User sessions
SET session:{session_id} "{user_id: uuid, merchant_id: uuid, expires_at: timestamp}"
EXPIRE session:{session_id} 86400  # 24 hours

# User authentication cache
HSET user:{user_id}:auth wallet_address merchant_id last_login
EXPIRE user:{user_id}:auth 3600  # 1 hour
```

#### Rate Limiting
```redis
# API rate limiting (sliding window)
ZADD rate_limit:{api_key} {timestamp} {timestamp}
EXPIRE rate_limit:{api_key} 3600

# Transaction rate limiting per merchant
INCR tx_limit:{merchant_id}:{window}
EXPIRE tx_limit:{merchant_id}:{window} 300  # 5 minutes
```

#### Real-time Analytics
```redis
# Real-time counters
INCR analytics:daily:{date}:transactions
INCR analytics:daily:{date}:volume {amount}
INCR analytics:merchant:{merchant_id}:daily:{date}:transactions

# Leaderboards
ZADD merchant_leaderboard:{period} {volume} {merchant_id}
ZADD token_leaderboard:{period} {volume} {token_address}
```

#### Caching Queries
```redis
# Merchant profile cache
SET merchant:{merchant_id}:profile "{json_data}"
EXPIRE merchant:{merchant_id}:profile 1800  # 30 minutes

# Recent transactions cache
LPUSH merchant:{merchant_id}:recent_transactions "{transaction_data}"
LTRIM merchant:{merchant_id}:recent_transactions 0 49  # Keep latest 50
EXPIRE merchant:{merchant_id}:recent_transactions 3600
```

### 7.2 Pub/Sub Channels
```redis
# Real-time notifications
PUBLISH user:{user_id}:notifications "{notification_data}"
PUBLISH merchant:{merchant_id}:transactions "{transaction_data}"
PUBLISH system:alerts "{alert_data}"

# Blockchain events
PUBLISH blockchain:transactions "{tx_data}"
PUBLISH blockchain:confirmations "{confirmation_data}"
```

## 8. Indexing Strategy

### 8.1 Primary Indexes (Already defined above)
- Unique constraints for business logic
- Foreign key indexes for joins
- Time-based indexes for analytics
- Status indexes for filtering

### 8.2 Composite Indexes
```sql
-- Multi-column indexes for common queries
CREATE INDEX idx_transactions_merchant_status_date 
ON transactions (merchant_id, status, created_at DESC);

CREATE INDEX idx_rewards_merchant_status_type 
ON rewards (merchant_id, status, reward_type);

CREATE INDEX idx_payment_intents_merchant_status_expires 
ON payment_intents (merchant_id, status, expires_at);
```

### 8.3 Partial Indexes
```sql
-- Indexes on filtered data
CREATE INDEX idx_transactions_pending 
ON transactions (created_at DESC) 
WHERE status = 'pending';

CREATE INDEX idx_merchants_active 
ON merchants (business_category, total_volume DESC) 
WHERE is_active = true;

CREATE INDEX idx_rewards_claimable 
ON rewards (merchant_id, amount DESC) 
WHERE status = 'approved';
```

## 9. Performance Optimization

### 9.1 Partitioning Strategy
- **Transactions**: Monthly partitions by `created_at`
- **Audit Logs**: Monthly partitions by `created_at`
- **Analytics**: Consider yearly partitions for long-term data

### 9.2 Connection Pooling
```sql
-- PgBouncer configuration
pool_mode = transaction
default_pool_size = 25
max_client_conn = 1000
max_db_connections = 100
```

### 9.3 Query Optimization
```sql
-- Use EXPLAIN ANALYZE for query optimization
EXPLAIN (ANALYZE, BUFFERS) 
SELECT m.business_name, COUNT(t.id) as transaction_count
FROM merchants m
LEFT JOIN transactions t ON m.id = t.merchant_id AND t.status = 'confirmed'
WHERE m.is_active = true
GROUP BY m.id, m.business_name
ORDER BY transaction_count DESC
LIMIT 10;
```

## 10. Backup and Recovery

### 10.1 Backup Strategy
```sql
-- Daily full backup
pg_dump -h localhost -U postgres -d verypay > backup_$(date +%Y%m%d).sql

-- Continuous WAL archiving
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
wal_level = replica
```

### 10.2 Point-in-Time Recovery
```sql
-- Restore to specific timestamp
pg_basebackup -h localhost -D /recovery -U postgres -P -W
# Edit postgresql.conf
restore_command = 'cp /backup/wal/%f %p'
recovery_target_time = '2024-01-15 12:00:00'
```

## 11. Security Considerations

### 11.1 Data Encryption
- **At Rest**: Transparent Data Encryption (TDE)
- **In Transit**: SSL/TLS connections
- **Application Level**: Encrypt sensitive fields (API keys, personal data)

### 11.2 Access Control
```sql
-- Role-based access control
CREATE ROLE verypay_api;
CREATE ROLE verypay_analytics;
CREATE ROLE verypay_admin;

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE ON transactions TO verypay_api;
GRANT SELECT ON merchant_analytics_daily TO verypay_analytics;
GRANT ALL PRIVILEGES ON ALL TABLES TO verypay_admin;
```

### 11.3 Data Privacy
```sql
-- GDPR compliance functions
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET 
        email = 'deleted@example.com',
        display_name = 'Deleted User',
        bio = NULL,
        social_links = '{}',
        kyc_data = NULL
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

This database schema provides a robust foundation for the VeryPay system with proper normalization, indexing, and scalability considerations.