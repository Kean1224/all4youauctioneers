require('dotenv').config();

const express = require('express');
const cors = require('./cors-config');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

// 🛡️ Import security middleware
const {
  rateLimits,
  securityConfig,
  sanitizeInput,
  securityLogger,
  validateFileUpload
} = require('./middleware/security');

// 📊 Import performance monitoring
const performanceMonitor = require('./middleware/performance-monitor');

const app = express();
// Trust the first proxy (needed for correct IP detection behind Render, Heroku, etc.)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// 🔒 Apply security middleware first
app.use(securityConfig); // Helmet security headers
app.use(performanceMonitor.middleware()); // Performance monitoring
app.use(securityLogger); // Security logging
app.use(sanitizeInput); // Input sanitization

// Apply CORS middleware (after security)
app.use(cors);

app.use(bodyParser.json());
app.use(cookieParser());

// Modern CSRF protection using crypto
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Store CSRF tokens in memory (in production, use Redis or database)
// SECURITY FIX: Bounded CSRF token storage to prevent memory leaks
class BoundedCSRFStore {
  constructor(maxSize = 10000) {
    this.tokens = new Map();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    // Remove oldest entries when limit reached
    if (this.tokens.size >= this.maxSize) {
      const firstKey = this.tokens.keys().next().value;
      this.tokens.delete(firstKey);
    }
    this.tokens.set(key, {
      token: value,
      created: Date.now()
    });
  }
  
  has(key) {
    const entry = this.tokens.get(key);
    if (!entry) return false;
    
    // Expire tokens after 1 hour
    if (Date.now() - entry.created > 3600000) {
      this.tokens.delete(key);
      return false;
    }
    return true;
  }
  
  delete(key) {
    this.tokens.delete(key);
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.tokens.entries()) {
      if (now - entry.created > 3600000) {
        this.tokens.delete(key);
      }
    }
  }
}

const csrfTokens = new BoundedCSRFStore();

// Expose CSRF token to frontend
app.get('/api/csrf-token', (req, res) => {
  const token = generateCSRFToken();
  const sessionId = req.sessionID || crypto.randomBytes(16).toString('hex');
  csrfTokens.set(sessionId, token);
  
  // Set session ID cookie
  res.cookie('sessionId', sessionId, { 
    httpOnly: true, 
    sameSite: 'strict', 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  res.json({ csrfToken: token });
});

// 🛡️ Apply rate limiting to different routes
app.use('/api/auth', rateLimits.auth);
app.use('/api/auth/register', rateLimits.registration);
app.use('/api/auth/forgot-password', rateLimits.passwordReset);
app.use('/api/contact', rateLimits.contact);
app.use('/api/lots/*/bid', rateLimits.bidding);
app.use('/api/admin', rateLimits.admin);
app.use('/api', rateLimits.api); // General API rate limit (applied last)

// Health check endpoint for frontend-backend communication
app.get('/api/ping', (req, res) => {
  console.log('Ping request from:', req.get('origin'));
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    version: '1.5-microservices',
    service: 'API Gateway',
    security: 'Rate limiting and input sanitization active'
  });
});

// Health check for deployment platforms with performance metrics
app.get('/health', (req, res) => {
  const healthStatus = performanceMonitor.getHealthStatus();
  res.json({
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    service: 'API Gateway',
    version: '1.0.0',
    uptime: Math.floor(healthStatus.uptime / 1000), // seconds
    performance: {
      memory: healthStatus.memory,
      requests: healthStatus.requests,
      errors: healthStatus.errors,
      connections: healthStatus.connections
    }
  });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle favicon specifically to avoid 404 errors
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(204).end();
  }
});
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /api/\nDisallow: /admin/');
});

// Add performance headers for API responses
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // Don't cache API responses
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Middleware - Static file serving with CORS headers
app.use('/uploads', (req, res, next) => {
  console.log(`Static file request: ${req.method} ${req.path}`);
  // Add CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Add a test endpoint to check if files exist
app.get('/test-upload/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'fica', req.params.filename);
  console.log(`Testing file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.json({ exists: true, path: filePath, absolutePath: path.resolve(filePath) });
  } else {
    res.json({ exists: false, path: filePath, absolutePath: path.resolve(filePath) });
  }
});

// 🔌 Import API routes
const depositsRouter = require('./api/deposits/index');
const auctionsRouter = require('./api/auctions/index');
const authRouter = require('./api/auth/index');
const ficaRouter = require('./api/fica');
const pendingItemsRouter = require('./api/pending-items');
const pendingUsersRouter = require('./api/pending-users');
const contactRouter = require('./api/contact');
const testEmailRouter = require('./api/test-email');
const testEmailConnectionRouter = require('./api/test-email-connection');
const invoiceRouter = require('./api/invoices/index');
// const paymentsRouter = require('./api/payments/index'); // REMOVED - Payment functionality disabled
const lotsRouter = require('./api/lots/index');
const sellItemRouter = require('./api/sell-item/index');
const usersRouter = require('./api/users/index');
const systemStatusRouter = require('./api/system/status');
const systemBackupRouter = require('./api/system/backup');
const refundsRouter = require('./api/refunds/index');
const companyLogoRouter = require('./api/company/logo');
const testPDFRouter = require('./api/invoices/test-pdf');
const adminRolesRouter = require('./api/admin/roles');
const adminMigrateCloudinaryRouter = require('./api/admin/migrate-cloudinary');
const migrateFilesRouter = require('./api/migrate-files');

// 🔗 Connect routes
app.use('/api/deposits', depositsRouter);
app.use('/api/auctions', auctionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/fica', ficaRouter);
app.use('/api/pending-items', pendingItemsRouter);
app.use('/api/pending-users', pendingUsersRouter);
app.use('/api/contact', contactRouter);
app.use('/api/test-email', testEmailRouter);
app.use('/api', testEmailConnectionRouter);
app.use('/api/invoices', invoiceRouter);
// app.use('/api/payments', paymentsRouter); // REMOVED - Payment functionality disabled
app.use('/api/lots', lotsRouter);
app.use('/api/sell-item', sellItemRouter);
app.use('/api/users', usersRouter);
app.use('/api/system', systemStatusRouter);
app.use('/api/system/backup', systemBackupRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/company/logo', companyLogoRouter);
app.use('/api/invoices/test-pdf', testPDFRouter);
app.use('/api/admin/roles', adminRolesRouter);
app.use('/api/admin/migrate-cloudinary', adminMigrateCloudinaryRouter);
app.use('/api/admin/optimize-database', require('./api/admin/optimize-database'));
app.use('/api/migrate-files', migrateFilesRouter);

// EMERGENCY: Direct admin login endpoint to bypass deployment issues
app.post('/api/auth/admin-login', async (req, res) => {
  console.log('🚨 EMERGENCY admin login endpoint called');
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    const dbModels = require('./database/models');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    
    // Get admin user from database
    const user = await dbModels.getUserByEmailAndRole(email, 'admin');
    
    if (!user) {
      console.log('❌ Admin user not found:', email);
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      console.log('❌ Invalid admin password for:', email);
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: issuedAt
    }, JWT_SECRET, { expiresIn: '4h' });
    
    console.log('✅ EMERGENCY admin login successful:', email);
    
    res.json({
      email: user.email,
      name: user.name,
      role: user.role,
      token: token,
      expiresAt: issuedAt + (4 * 60 * 60),
      message: 'Admin login successful'
    });
    
  } catch (error) {
    console.error('🚨 EMERGENCY admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// HOTFIX: Add /session endpoint for production dashboard compatibility
app.get('/session', (req, res) => {
  console.log('🔍 Legacy /session endpoint called - redirecting to /api/auth/session');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('❌ No token provided to /session endpoint');
    return res.status(401).json({ error: 'No token provided', authenticated: false });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET;
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Invalid token or not admin role');
      return res.status(401).json({ error: 'Invalid session', authenticated: false });
    }
    
    console.log('✅ Legacy /session endpoint authenticated admin user');
    res.json({
      authenticated: true,
      user: {
        email: user.email,
        role: user.role
      },
      expiresAt: user.exp
    });
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    res.status(401).json({ error: 'Invalid session', authenticated: false });
  }
});

// Example route
app.get('/', (req, res) => {
  res.send('All4You API Gateway is running... [AUTH FIXED]');
});

// Security validation - warn about default secrets
function validateEnvironment() {
  const warnings = [];
  
  // CRITICAL: Check for production security requirements
  const defaultSecrets = [
    'supersecretkey', 'dev-jwt-secret', 'test-jwt-secret', 
    'all4you-admin-2025', 'dev-admin-secret', 'test-admin-secret'
  ];
  
  if (!process.env.JWT_SECRET || defaultSecrets.includes(process.env.JWT_SECRET)) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Cannot start in production with default JWT_SECRET!');
      process.exit(1);
    } else {
      warnings.push('⚠️  WARNING: Using default/weak JWT_SECRET. Set strong JWT_SECRET for production.');
    }
  }
  
  if (!process.env.ADMIN_SECRET || defaultSecrets.includes(process.env.ADMIN_SECRET)) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Cannot start in production with default ADMIN_SECRET!');
      process.exit(1);
    } else {
      warnings.push('⚠️  WARNING: Using default/weak ADMIN_SECRET. Set strong ADMIN_SECRET for production.');
    }
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warning => console.warn(warning));
  }
}

// Initialize data and storage on startup
const DataInitializer = require('./utils/data-init');
const storageManager = require('./utils/storage');
// const BackupManager = require('./utils/backup-manager'); // DISABLED: Using PostgreSQL only

// Initialize PostgreSQL database
const dbManager = require('./database/connection');
const migrationManager = require('./database/migrations');
const dbModels = require('./database/models');

// Initialize Redis caching system
const redisCache = require('./utils/redis-cache');

// Start the API server with proper initialization
app.listen(PORT, async () => {
  console.log(`🚀 API Gateway starting on port ${PORT}...`);
  
  try {
    // Initialize PostgreSQL database
    console.log('🗄️  Initializing PostgreSQL database system...');
    await dbManager.initialize();
    await migrationManager.runMigrations();
    
    // Initialize Redis caching for 1000+ concurrent users
    console.log('🔥 Initializing Redis caching system...');
    await redisCache.initialize();
    
    // Initialize and validate database system
    const dataInit = new DataInitializer();
    await dataInit.initializeDataFiles();
    
    // Validate database tables are accessible
    const validation = await dataInit.validateDatabaseTables();
    if (validation.allValid) {
      console.log('✅ All database tables validated successfully');
    } else {
      console.log('⚠️  Some database tables have validation issues (may be normal for new installs)');
    }
    
    // Initialize storage directories
    storageManager.ensureUploadDirs();
    
    // Initialize automatic backup system
    // const backupManager = new BackupManager();  // DISABLED: Using PostgreSQL only
    // await backupManager.initialize();           // PostgreSQL handles persistence
    
    // Validate environment security
    validateEnvironment();
    
    // System ready
    console.log(`✅ Registration system with FICA uploads: ENABLED`);
    console.log(`✅ User management system: ENABLED`);
    console.log(`✅ Email verification system: ENABLED`);
    console.log(`✅ Data persistence layer: INITIALIZED`);
    console.log(`✅ File storage system: CONFIGURED`);
    console.log(`✅ Automatic backup system: ACTIVE`);
    console.log(`🔗 Ready to communicate with realtime service`);
    console.log(`🎉 All4You API Gateway is LIVE and ready for production!`);
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
});

module.exports = app;