const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const usersPath = path.join(__dirname, '../users/../../data/users.json');

// Helper function to read users
function readUsers() {
  if (!fs.existsSync(usersPath)) return [];
  return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
}

// POST /api/auth/login - User login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    // Security logging
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log(`[SECURITY] ${new Date().toISOString()}: USER_LOGIN_FAILED - User not found`, {
      email,
      ip: clientIP,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if user is suspended
  if (user.suspended) {
    return res.status(403).json({ error: 'Account suspended. Please contact support.' });
  }

  // Check password using bcrypt with migration support
  try {
    let isPasswordValid = false;
    
    // Check if password is already hashed
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // Use bcrypt to compare hashed password
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plain text password - check and migrate
      isPasswordValid = user.password === password;
      if (isPasswordValid) {
        // Migrate password to bcrypt hash
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Update user in users.json
        const users = readUsers();
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
          users[userIndex].password = hashedPassword;
          fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8');
          console.log(`[SECURITY] Password migrated to bcrypt for user: ${email}`);
        }
      }
    }
    
    if (!isPasswordValid) {
      // Security logging
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
      console.log(`[SECURITY] ${new Date().toISOString()}: USER_LOGIN_FAILED - Invalid password`, {
        email,
        ip: clientIP,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error comparing password during login:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }

  // Generate JWT token
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      email: user.email,
      role: 'user',
      iat: issuedAt
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Security logging for successful login
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  console.log(`[SECURITY] ${new Date().toISOString()}: USER_LOGIN_SUCCESS`, {
    email: user.email,
    ip: clientIP,
    userAgent: req.headers['user-agent']
  });

  // Return success response
  res.json({
    token,
    email: user.email,
    role: 'user',
    ficaApproved: user.ficaApproved,
    suspended: user.suspended,
    expiresAt: issuedAt + (24 * 60 * 60), // 24 hours from now
    message: 'Login successful'
  });
});

// Import and use admin login
const adminLogin = require('./admin-login');
router.post('/admin-login', adminLogin);

// Import and use admin verification
const verifyAdmin = require('./verify-admin');
router.post('/verify-admin', verifyAdmin);
router.get('/verify-admin', verifyAdmin); // Support both GET and POST

// Session endpoint for admin dashboard
router.get('/session', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided', authenticated: false });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    
    // Check if token is still valid and not expired
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid session', authenticated: false });
    }
    
    // Return session info
    res.json({
      authenticated: true,
      user: {
        email: user.email,
        role: user.role
      },
      expiresAt: user.exp
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid session', authenticated: false });
  }
});

// Test endpoint to verify deployment
router.get('/test-deployment', (req, res) => {
  res.json({ 
    status: 'deployed', 
    timestamp: new Date().toISOString(),
    message: 'session and verify-admin endpoints available',
    version: '3.0',
    endpoints: {
      'GET /auth/session': 'available',
      'GET /auth/verify-admin': 'available', 
      'POST /auth/verify-admin': 'available'
    }
  });
});

module.exports = router;