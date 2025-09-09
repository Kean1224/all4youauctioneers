// Redis caching system for 1000+ concurrent users
// High-performance caching for auctions, bids, and sessions

const redis = require('redis');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Redis cache for high-performance scaling...');
      
      // Get Redis URL from environment
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        console.warn('⚠️  REDIS_URL not configured - using in-memory cache (not recommended for production)');
        return this.initializeFallback();
      }
      
      // Create Redis client
      this.client = redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 5) {
            console.error('❌ Redis max retry attempts reached');
            return undefined;
          }
          // Exponential backoff
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Set up event handlers
      this.client.on('connect', () => {
        console.log('🔗 Redis client connected');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready for high-performance caching');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis client error:', error.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis client connection ended');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      console.log('🎉 Redis cache system initialized successfully!');
      console.log('📊 Ready for 1000+ concurrent users with caching');
      
      return true;
      
    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message);
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying Redis connection (${this.connectionAttempts}/${this.maxRetries}) in 5s...`);
        setTimeout(() => this.initialize(), 5000);
        return false;
      }
      
      console.warn('⚠️  Max Redis retries exceeded - falling back to in-memory cache');
      return this.initializeFallback();
    }
  }

  /**
   * Fallback to in-memory cache if Redis unavailable
   */
  initializeFallback() {
    console.log('🔄 Initializing fallback in-memory cache...');
    this.fallbackCache = new Map();
    this.isConnected = false;
    console.log('⚠️  Using in-memory cache - not suitable for multiple instances');
    return true;
  }

  /**
   * Set cache value with TTL
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (!this.isConnected && this.client) {
        console.warn('⚠️  Redis not connected, using fallback cache');
        if (this.fallbackCache) {
          this.fallbackCache.set(key, {
            value,
            expires: Date.now() + (ttlSeconds * 1000)
          });
        }
        return true;
      }

      if (this.client) {
        const serializedValue = JSON.stringify(value);
        await this.client.setEx(key, ttlSeconds, serializedValue);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    try {
      if (!this.isConnected && this.client) {
        if (this.fallbackCache) {
          const item = this.fallbackCache.get(key);
          if (item && item.expires > Date.now()) {
            return item.value;
          }
          if (item) {
            this.fallbackCache.delete(key); // Clean up expired
          }
        }
        return null;
      }

      if (this.client) {
        const result = await this.client.get(key);
        return result ? JSON.parse(result) : null;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async del(key) {
    try {
      if (!this.isConnected && this.client) {
        if (this.fallbackCache) {
          this.fallbackCache.delete(key);
        }
        return true;
      }

      if (this.client) {
        await this.client.del(key);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern) {
    try {
      if (!this.isConnected && this.client) {
        if (this.fallbackCache) {
          const keysToDelete = [];
          for (const key of this.fallbackCache.keys()) {
            if (key.includes(pattern)) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(key => this.fallbackCache.delete(key));
        }
        return true;
      }

      if (this.client) {
        const keys = await this.client.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Redis clear pattern error for ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      connected: this.isConnected,
      fallbackMode: !this.isConnected && !!this.fallbackCache,
      connectionAttempts: this.connectionAttempts
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      console.log('🔒 Closing Redis connection...');
      await this.client.quit();
      this.isConnected = false;
      console.log('✅ Redis connection closed');
    }
  }
}

// Export singleton instance
const redisCache = new RedisCache();
module.exports = redisCache;