const { Pool } = require('pg');

/**
 * PostgreSQL Database Connection Manager
 * Replaces JSON file storage with proper database operations
 */
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      console.log('🗄️  Initializing PostgreSQL connection...');
      
      // Database configuration
      const dbConfig = {
        // Production database URL from environment
        connectionString: process.env.DATABASE_URL,
        
        // Development fallback configuration
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'all4you_auctions',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || 'password',
        
        // Connection pool settings
        max: 20, // Maximum number of clients
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 10000, // Return error if connection takes longer than 10 seconds
        
        // SSL configuration for Render PostgreSQL (always required)
        ssl: {
          rejectUnauthorized: false
        }
      };

      // Create connection pool
      this.pool = new Pool(dbConfig);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      this.retryAttempts = 0;
      
      console.log('✅ PostgreSQL connection established successfully');
      console.log(`📊 Database: ${dbConfig.database || 'from URL'}`);
      
      // Set up error handlers
      this.setupErrorHandlers();
      
      return true;
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      
      // Retry logic for production reliability
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        console.log(`🔄 Retrying database connection (${this.retryAttempts}/${this.maxRetries}) in ${this.retryDelay}ms...`);
        
        setTimeout(() => {
          this.initialize();
        }, this.retryDelay);
        
        return false;
      }
      
      console.error('💀 Max database connection retries exceeded');
      throw error;
    }
  }

  /**
   * Set up error handlers for connection pool
   */
  setupErrorHandlers() {
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err);
      this.isConnected = false;
      
      // Attempt to reconnect
      setTimeout(() => {
        this.initialize();
      }, this.retryDelay);
    });

    this.pool.on('connect', () => {
      console.log('🔗 New database client connected');
    });

    this.pool.on('remove', () => {
      console.log('👋 Database client removed from pool');
    });
  }

  /**
   * Execute query with error handling and retry logic
   */
  async query(text, params = []) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Call initialize() first.');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log(`🗄️  Query executed in ${duration}ms:`, text.substring(0, 100));
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ Query failed after ${duration}ms:`, {
        query: text.substring(0, 100),
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('🔄 Transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed');
      
      return result;
      
    } catch (error) {
      try {
        await client.query('ROLLBACK');
        console.error('⚠️  Transaction rolled back:', error.message);
      } catch (rollbackError) {
        console.error('❌ ROLLBACK failed:', rollbackError.message);
      }
      throw error;
      
    } finally {
      try {
        client.release();
      } catch (releaseError) {
        console.error('❌ Client release failed:', releaseError.message);
        // Don't throw here to avoid masking original error
      }
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    if (!this.pool) return null;
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    };
  }

  /**
   * Close all database connections
   */
  async close() {
    if (this.pool) {
      console.log('🔒 Closing database connections...');
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Database connections closed');
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy, NOW() as timestamp');
      return {
        healthy: true,
        timestamp: result.rows[0].timestamp,
        poolStats: this.getPoolStats()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        poolStats: this.getPoolStats()
      };
    }
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;