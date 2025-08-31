const os = require('os');

// =� Production Performance Monitoring System
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: { total: 0, active: 0 },
      responseTime: { avg: 0, samples: [] },
      errors: { count: 0, rate: 0 },
      memory: { usage: 0, limit: 512 * 1024 * 1024 }, // 512MB limit
      cpu: { usage: 0 },
      connections: { active: 0, max: 1000 }
    };

    this.startTime = Date.now();
    this.lastCleanup = Date.now();
    
    // Start monitoring
    if (process.env.NODE_ENV === 'production') {
      this.startMonitoring();
    }
  }

  // Start background monitoring
  startMonitoring() {
    // Monitor system resources every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
      this.checkResourceLimits();
      this.cleanupOldMetrics();
    }, 30000);

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 300000);
  }

  // Update system metrics
  updateSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      this.metrics.memory.usage = memUsage.heapUsed;
      
      const cpuUsage = process.cpuUsage();
      this.metrics.cpu.usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

      // Calculate error rate (errors per hour)
      const hourMs = 60 * 60 * 1000;
      const timeRunning = Math.min(Date.now() - this.startTime, hourMs);
      this.metrics.errors.rate = (this.metrics.errors.count / timeRunning) * hourMs;

    } catch (error) {
      console.error('Error updating system metrics:', error);
    }
  }

  // Check if we're approaching resource limits
  checkResourceLimits() {
    const memUsage = this.metrics.memory.usage;
    const memLimit = this.metrics.memory.limit;
    const memPercentage = (memUsage / memLimit) * 100;

    // Memory warnings
    if (memPercentage > 80) {
      console.warn(`�  HIGH MEMORY USAGE: ${memPercentage.toFixed(1)}% (${Math.round(memUsage/1024/1024)}MB)`);
      if (memPercentage > 95) {
        console.error('=� CRITICAL MEMORY USAGE - Consider scaling up!');
      }
    }

    // Active connections warning
    if (this.metrics.connections.active > this.metrics.connections.max * 0.8) {
      console.warn(`�  HIGH CONNECTION COUNT: ${this.metrics.connections.active}/${this.metrics.connections.max}`);
    }

    // Error rate warning
    if (this.metrics.errors.rate > 10) { // More than 10 errors per hour
      console.warn(`�  HIGH ERROR RATE: ${this.metrics.errors.rate.toFixed(1)} errors/hour`);
    }
  }

  // Clean up old metrics to prevent memory leaks
  cleanupOldMetrics() {
    const now = Date.now();
    
    // Clean up old response time samples (keep only last hour)
    this.metrics.responseTime.samples = this.metrics.responseTime.samples.filter(
      sample => now - sample.timestamp < 3600000 // 1 hour
    );

    // Recalculate average response time
    if (this.metrics.responseTime.samples.length > 0) {
      const sum = this.metrics.responseTime.samples.reduce((s, sample) => s + sample.time, 0);
      this.metrics.responseTime.avg = sum / this.metrics.responseTime.samples.length;
    }

    this.lastCleanup = now;
  }

  // Log current metrics
  logMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000 / 60); // minutes
    const memMB = Math.round(this.metrics.memory.usage / 1024 / 1024);
    
    console.log('=� Performance Metrics:');
    console.log(`   Uptime: ${uptime} minutes`);
    console.log(`   Total Requests: ${this.metrics.requests.total}`);
    console.log(`   Active Requests: ${this.metrics.requests.active}`);
    console.log(`   Avg Response Time: ${this.metrics.responseTime.avg.toFixed(1)}ms`);
    console.log(`   Memory Usage: ${memMB}MB`);
    console.log(`   Error Count: ${this.metrics.errors.count}`);
    console.log(`   Error Rate: ${this.metrics.errors.rate.toFixed(1)}/hour`);
    console.log(`   Active Connections: ${this.metrics.connections.active}`);
  }

  // Middleware function for Express
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request start
      this.metrics.requests.total++;
      this.metrics.requests.active++;
      this.metrics.connections.active++;

      // Track request completion
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Update metrics
        this.metrics.requests.active--;
        this.metrics.connections.active--;
        
        // Track response time
        this.metrics.responseTime.samples.push({
          time: responseTime,
          timestamp: Date.now()
        });

        // Track errors (exclude 404s for non-API routes like favicon.ico, robots.txt, etc.)
        if (res.statusCode >= 400) {
          const isApiRoute = req.path.startsWith('/api/') || req.path.startsWith('/health');
          const is404NonApi = res.statusCode === 404 && !isApiRoute;
          
          // Only count as error if it's an API route or non-404 error
          if (!is404NonApi) {
            this.metrics.errors.count++;
          }
        }

        // Log slow requests in production
        if (responseTime > 5000 && process.env.NODE_ENV === 'production') {
          console.warn(`= Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
        }
      });

      // Track connection closes
      req.on('close', () => {
        if (this.metrics.requests.active > 0) {
          this.metrics.requests.active--;
        }
        if (this.metrics.connections.active > 0) {
          this.metrics.connections.active--;
        }
      });

      next();
    };
  }

  // Get health status
  getHealthStatus() {
    const memPercentage = (this.metrics.memory.usage / this.metrics.memory.limit) * 100;
    const uptime = Date.now() - this.startTime;
    
    return {
      status: memPercentage > 95 || this.metrics.errors.rate > 50 ? 'critical' : 
              memPercentage > 80 || this.metrics.errors.rate > 10 ? 'warning' : 'healthy',
      uptime: uptime,
      memory: {
        used: this.metrics.memory.usage,
        percentage: memPercentage
      },
      requests: {
        total: this.metrics.requests.total,
        active: this.metrics.requests.active,
        avgResponseTime: this.metrics.responseTime.avg
      },
      errors: {
        count: this.metrics.errors.count,
        rate: this.metrics.errors.rate
      },
      connections: {
        active: this.metrics.connections.active,
        max: this.metrics.connections.max
      },
      timestamp: new Date().toISOString()
    };
  }

  // Force garbage collection if available
  forceCleanup() {
    try {
      if (global.gc) {
        global.gc();
        console.log('>� Forced garbage collection');
      }
    } catch (error) {
      console.error('Error during forced cleanup:', error);
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;