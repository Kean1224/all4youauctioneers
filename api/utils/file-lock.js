const fs = require('fs').promises;
const path = require('path');

/**
 * File Lock Manager - Prevents race conditions in data operations
 * Critical for preventing bid conflicts and data corruption
 */
class FileLockManager {
  constructor() {
    this.locks = new Map(); // file -> {locked: boolean, queue: []}
    this.lockTimeout = 30000; // 30 second timeout
  }

  /**
   * Acquire exclusive lock on file
   */
  async acquireLock(filePath) {
    const normalizedPath = path.resolve(filePath);
    
    if (!this.locks.has(normalizedPath)) {
      this.locks.set(normalizedPath, { locked: false, queue: [] });
    }
    
    const lock = this.locks.get(normalizedPath);
    
    return new Promise((resolve, reject) => {
      const lockRequest = {
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      if (!lock.locked) {
        // Lock is available
        lock.locked = true;
        console.log(`🔒 Lock acquired: ${normalizedPath}`);
        resolve();
      } else {
        // Add to queue
        lock.queue.push(lockRequest);
        console.log(`⏳ Lock queued: ${normalizedPath} (${lock.queue.length} waiting)`);
        
        // Set timeout
        setTimeout(() => {
          const index = lock.queue.indexOf(lockRequest);
          if (index !== -1) {
            lock.queue.splice(index, 1);
            reject(new Error(`Lock timeout after ${this.lockTimeout}ms: ${normalizedPath}`));
          }
        }, this.lockTimeout);
      }
    });
  }

  /**
   * Release lock on file
   */
  releaseLock(filePath) {
    const normalizedPath = path.resolve(filePath);
    const lock = this.locks.get(normalizedPath);
    
    if (!lock || !lock.locked) {
      console.warn(`⚠️  Attempt to release unlocked file: ${normalizedPath}`);
      return;
    }
    
    // Process queue
    if (lock.queue.length > 0) {
      const next = lock.queue.shift();
      console.log(`🔄 Lock transferred: ${normalizedPath} (${lock.queue.length} remaining)`);
      next.resolve();
    } else {
      lock.locked = false;
      console.log(`🔓 Lock released: ${normalizedPath}`);
    }
  }

  /**
   * Execute function with exclusive file lock
   */
  async withLock(filePath, fn) {
    await this.acquireLock(filePath);
    
    try {
      const result = await fn();
      return result;
    } finally {
      this.releaseLock(filePath);
    }
  }

  /**
   * Get lock statistics
   */
  getLockStats() {
    const stats = {
      totalFiles: this.locks.size,
      lockedFiles: 0,
      queuedRequests: 0,
      files: {}
    };
    
    for (const [filePath, lock] of this.locks.entries()) {
      if (lock.locked) stats.lockedFiles++;
      stats.queuedRequests += lock.queue.length;
      
      stats.files[filePath] = {
        locked: lock.locked,
        queueLength: lock.queue.length
      };
    }
    
    return stats;
  }
}

// Export singleton instance
const lockManager = new FileLockManager();
module.exports = lockManager;