// backend/middleware/cache.js
// Simple in-memory cache for performance optimization

class SimpleCache {
  constructor(defaultTTL = 300000) { // Default 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    
    // Clean up expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  // Get cache stats
  stats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expired++;
      } else {
        active++;
      }
    }
    
    return {
      total: this.cache.size,
      active,
      expired,
      hitRate: this.hitRate || 0
    };
  }
}

// Cache instances for different data types
const auctionCache = new SimpleCache(180000); // 3 minutes for auctions
const userCache = new SimpleCache(600000);    // 10 minutes for user data
const lotCache = new SimpleCache(120000);     // 2 minutes for lots
const depositCache = new SimpleCache(300000); // 5 minutes for deposits

// Cache middleware factory
const cacheMiddleware = (cacheInstance, keyGenerator, ttl) => {
  return (req, res, next) => {
    const key = keyGenerator(req);
    const cached = cacheInstance.get(key);
    
    if (cached) {
      console.log(`🎯 Cache HIT: ${key}`);
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode === 200 && data) {
        console.log(`💾 Cache SET: ${key}`);
        cacheInstance.set(key, data, ttl);
      }
      return originalJson(data);
    };
    
    console.log(`❌ Cache MISS: ${key}`);
    next();
  };
};

// Cache invalidation helper
const invalidateCache = (pattern) => {
  [auctionCache, userCache, lotCache, depositCache].forEach(cache => {
    for (const key of cache.cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  });
};

// Pre-built cache middleware functions
const cacheAuctions = cacheMiddleware(
  auctionCache,
  (req) => `auctions:${req.path}:${JSON.stringify(req.query)}`,
  180000
);

const cacheLots = cacheMiddleware(
  lotCache,
  (req) => `lots:${req.params.auctionId || 'all'}:${req.path}`,
  120000
);

const cacheUsers = cacheMiddleware(
  userCache,
  (req) => `users:${req.path}:${req.params.id || 'all'}`,
  600000
);

const cacheDeposits = cacheMiddleware(
  depositCache,
  (req) => `deposits:${req.params.auctionId || 'all'}`,
  300000
);

module.exports = {
  SimpleCache,
  auctionCache,
  userCache,
  lotCache,
  depositCache,
  cacheMiddleware,
  invalidateCache,
  cacheAuctions,
  cacheLots,
  cacheUsers,
  cacheDeposits
};
