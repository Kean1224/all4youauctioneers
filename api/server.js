require('dotenv').config();

const express = require('express');
const cors = require('./cors-config');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// 🛡️ Import security middleware
const {
  rateLimits,
  securityConfig,
  sanitizeInput,
  securityLogger,
  validateFileUpload,
  csrfProtection
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
const paymentsRouter = require('./api/payments/index');
const lotsRouter = require('./api/lots/index');
const sellItemRouter = require('./api/sell-item/index');
const usersRouter = require('./api/users/index');
const systemStatusRouter = require('./api/system/status');
const systemBackupRouter = require('./api/system/backup');
const refundsRouter = require('./api/refunds/index');
const companyLogoRouter = require('./api/company/logo');
const testPDFRouter = require('./api/invoices/test-pdf');

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
app.use('/api/payments', paymentsRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/sell-item', sellItemRouter);
app.use('/api/users', usersRouter);
app.use('/api/system', systemStatusRouter);
app.use('/api/system/backup', systemBackupRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/company/logo', companyLogoRouter);
app.use('/api/invoices/test-pdf', testPDFRouter);

// Example route
app.get('/', (req, res) => {
  res.send('All4You API Gateway is running...');
});

// Security validation - warn about default secrets
function validateEnvironment() {
  const warnings = [];
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretkey') {
    warnings.push('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production.');
  }
  
  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET === 'all4you-admin-2025') {
    warnings.push('⚠️  WARNING: Using default ADMIN_SECRET. Set ADMIN_SECRET environment variable for production.');
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('🚨 SECURITY WARNINGS:');
    warnings.forEach(warning => console.error(warning));
    console.error('🚨 These default secrets pose a security risk in production!');
  } else if (warnings.length > 0) {
    warnings.forEach(warning => console.warn(warning));
  }
}

// Initialize data and storage on startup
const DataInitializer = require('./utils/data-init');
const storageManager = require('./utils/storage');
const BackupManager = require('./utils/backup-manager');

// Start the API server with proper initialization
app.listen(PORT, async () => {
  console.log(`🚀 API Gateway starting on port ${PORT}...`);
  
  try {
    // Initialize data files
    const dataInit = new DataInitializer();
    await dataInit.initializeDataFiles();
    await dataInit.validateDataIntegrity();
    
    // Initialize storage directories
    storageManager.ensureUploadDirs();
    
    // Initialize automatic backup system
    const backupManager = new BackupManager();
    await backupManager.initialize();
    
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