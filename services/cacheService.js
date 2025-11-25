// In-memory cache service (can be replaced with Redis in production)
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
  }

  // Set cache with TTL (time to live in seconds)
  set(key, value, ttl = 300) {
    this.cache.set(key, value);

    // Set expiry
    const expiryTime = Date.now() + (ttl * 1000);
    this.ttlMap.set(key, expiryTime);

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.delete(key);
    }, ttl * 1000);

    return true;
  }

  // Get cache
  get(key) {
    // Check if expired
    const expiryTime = this.ttlMap.get(key);
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  // Delete cache
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    return true;
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    return true;
  }

  // Check if key exists
  has(key) {
    const expiryTime = this.ttlMap.get(key);
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Get all keys
  keys() {
    return Array.from(this.cache.keys());
  }

  // Cache statistics
  stats() {
    return {
      size: this.cache.size,
      keys: this.keys(),
      timestamp: new Date().toISOString()
    };
  }

  // Cache with function (memoization)
  async memoize(key, fn, ttl = 300) {
    // Check if cached
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    this.set(key, result, ttl);
    return result;
  }
}

// Export singleton instance
module.exports = new CacheService();
