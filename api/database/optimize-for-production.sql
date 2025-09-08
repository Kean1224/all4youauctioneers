-- Database optimization script for All4You Auctions
-- Run this to optimize database performance for thousands of users

-- ==============================================
-- CRITICAL PERFORMANCE INDEXES
-- ==============================================

-- Composite indexes for common auction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lots_auction_status 
ON lots(auction_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_status_time 
ON auctions(status, start_time, end_time);

-- Bidding performance - most critical for live auctions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_lot_amount_time 
ON bids(lot_id, bid_amount DESC, bid_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_bidder_time 
ON bids(bidder_email, bid_time DESC);

-- User management optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified_fica 
ON users(email_verified, fica_approved);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_suspended 
ON users(role, suspended);

-- Partial indexes for active records (better performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_active 
ON auctions(id, start_time, end_time) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lots_active 
ON lots(auction_id, id, starting_bid) WHERE status = 'active';

-- Invoice and deposit tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deposits_user_auction 
ON deposits(user_email, auction_id, status);

-- ==============================================
-- QUERY PERFORMANCE ANALYSIS
-- ==============================================

-- Enable query statistics (if not already enabled)
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Create extension for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ==============================================
-- CONNECTION OPTIMIZATION
-- ==============================================

-- Increase connection limits for production
-- ALTER SYSTEM SET max_connections = 200;

-- Optimize for high concurrent load
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET random_page_cost = 1.1;

-- ==============================================
-- MAINTENANCE OPTIMIZATION
-- ==============================================

-- Enable auto-vacuum for high-write tables
ALTER TABLE bids SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE lots SET (autovacuum_vacuum_scale_factor = 0.2);
ALTER TABLE auctions SET (autovacuum_analyze_scale_factor = 0.1);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check index usage (run after deployment)
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_tup_read DESC;

-- Check table sizes
-- SELECT schemaname, tablename, 
--        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Performance monitoring
-- SELECT query, calls, total_time, mean_time, rows
-- FROM pg_stat_statements 
-- WHERE calls > 100 
-- ORDER BY total_time DESC 
-- LIMIT 10;