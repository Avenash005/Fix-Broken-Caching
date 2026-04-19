class CacheService {
  constructor(ttl = 5 * 60 * 1000) { // 5 min default
    this.store = new Map();
    this.defaultTtl = ttl;
  }

  _isExpired(entry) {
    return entry && Date.now() > entry.expiry;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry || this._isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data, ttl = this.defaultTtl) {
    if (data == null) return; // Don't cache null/undefined
    this.store.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  // Atomic get or set via fn
  async getOrSet(key, fn, ttl = this.defaultTtl) {
    let data = this.get(key);
    if (data !== null) return data;

    data = await fn();
    if (data != null) {
      this.set(key, data, ttl);
    }
    return data;
  }

  invalidate(keyOrPrefix) {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

module.exports = new CacheService();
