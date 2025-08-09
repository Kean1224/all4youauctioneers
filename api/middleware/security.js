const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 🛡️ Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      console.log(`⚠️  Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// 🔒 Different rate limits for different endpoints
const rateLimits = {
  // Authentication endpoints - strict limits
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many authentication attempts. Please try again in 15 minutes.'
  ),

  // Registration - very strict
  registration: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts
    'Too many registration attempts. Please try again in 1 hour.'
  ),

  // Password reset - strict
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    5, // 5 attempts
    'Too many password reset attempts. Please try again in 1 hour.'
  ),

  // File uploads - moderate limits
  fileUpload: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // 20 uploads
    'Too many file uploads. Please try again in 15 minutes.'
  ),

  // API calls - generous but protective
  api: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many API requests. Please try again in 15 minutes.',
    true // Skip successful requests
  ),

  // Bidding - special handling for auction activity
  bidding: createRateLimit(
    1 * 60 * 1000, // 1 minute
    30, // 30 bids per minute
    'Too many bids placed. Please slow down.',
    false // Count all requests
  ),

  // Contact form - prevent spam
  contact: createRateLimit(
    60 * 60 * 1000, // 1 hour
    5, // 5 messages
    'Too many contact form submissions. Please try again in 1 hour.'
  ),

  // Admin actions - moderate limits
  admin: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    50, // 50 actions
    'Too many admin actions. Please slow down.'
  )
};

// 🔐 Security headers configuration
const securityConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow CORS for API
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// 🛡️ Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        } else {
          obj[key] = sanitizeValue(obj[key]);
        }
      });
    }
  };

  // Sanitize request body
  if (req.body) {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    sanitizeObject(req.params);
  }

  next();
};

// 🔍 Security logging middleware
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /<script/gi, // Script injection
    /union\s+select/gi, // SQL injection
    /javascript:/gi, // JS protocol
    /data:text\/html/gi, // Data URL attacks
  ];

  const checkSuspicious = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  let suspicious = false;
  
  // Check request body, query, and params
  [req.body, req.query, req.params].forEach(obj => {
    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => {
        if (checkSuspicious(value)) {
          suspicious = true;
        }
      });
    }
  });

  if (suspicious) {
    console.log(`🚨 SECURITY ALERT: Suspicious request from ${req.ip} to ${req.path}`);
    console.log(`   User-Agent: ${req.get('User-Agent')}`);
    console.log(`   Body: ${JSON.stringify(req.body)}`);
    console.log(`   Query: ${JSON.stringify(req.query)}`);
  }

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400 || suspicious) {
      console.log(`🔍 Security Log: ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
    }
  });

  next();
};

// 🛡️ File upload security
const validateFileUpload = (req, res, next) => {
  if (req.files || req.file) {
    const files = req.files ? Object.values(req.files).flat() : [req.file];
    
    for (const file of files) {
      // Check file size (already handled by multer, but double-check)
      if (file.size > 5 * 1024 * 1024) { // 5MB
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }

      // Check file type more strictly
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain'
      ];

      if (!allowedMimes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type.' });
      }

      // Check for executable file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
      const fileExt = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      
      if (dangerousExtensions.includes(fileExt)) {
        return res.status(400).json({ error: 'File type not allowed for security reasons.' });
      }
    }
  }
  next();
};

// 🔐 CSRF Protection (manual implementation since csurf is deprecated)
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API authentication (JWT handles this)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // For form submissions, check referer
  const referer = req.get('Referer');
  const host = req.get('Host');
  
  if (!referer || !referer.includes(host)) {
    console.log(`🚨 CSRF: Invalid referer from ${req.ip}: ${referer}`);
    return res.status(403).json({ error: 'Invalid request origin' });
  }

  next();
};

module.exports = {
  rateLimits,
  securityConfig,
  sanitizeInput,
  securityLogger,
  validateFileUpload,
  csrfProtection
};
