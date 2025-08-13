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

// Admin verification endpoint (direct implementation)
const verifyAdminEndpoint = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  
  if (!token) {
    console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_ACCESS_DENIED`, { reason: 'No token provided', ip: clientIP });
    return res.status(401).json({ error: 'No token provided' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_TOKEN_INVALID`, { 
        reason: err.message, 
        ip: clientIP,
        token: token.substring(0, 20) + '...' 
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user || user.role !== 'admin') {
      console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_ROLE_MISMATCH`, { 
        user: user?.email || 'unknown',
        role: user?.role || 'none',
        ip: clientIP 
      });
      return res.status(401).json({ error: 'Unauthorized: Admin access required' });
    }

    // Check token age (additional security)
    const tokenAge = Date.now() / 1000 - user.iat;
    if (tokenAge > 4 * 60 * 60) { // 4 hours max
      console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_TOKEN_EXPIRED`, { 
        user: user.email,
        tokenAge: Math.floor(tokenAge / 60) + ' minutes',
        ip: clientIP 
      });
      return res.status(401).json({ error: 'Token expired - please login again' });
    }

    // Success - log access
    console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_ACCESS_GRANTED`, { 
      user: user.email,
      path: req.path || 'unknown',
      method: req.method || 'unknown',
      ip: clientIP 
    });

    // Return success
    return res.json({ 
      ok: true, 
      user: { email: user.email, role: user.role },
      expiresAt: user.exp 
    });
  });
};

router.post('/verify-admin', verifyAdminEndpoint);
router.get('/verify-admin', verifyAdminEndpoint);

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

// POST /api/auth/verify-email - Email verification endpoint
router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { email } = decoded;
    
    // Find the user
    const users = readUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already verified
    if (users[userIndex].emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Mark as verified
    users[userIndex].emailVerified = true;
    users[userIndex].verifiedAt = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    // Create login token for immediate access
    const loginToken = jwt.sign(
      { email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Email verified successfully! You are now logged in.',
      token: loginToken,
      user: {
        email: users[userIndex].email,
        name: users[userIndex].name,
        ficaApproved: users[userIndex].ficaApproved
      }
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }
    
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  
  try {
    const users = readUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }
    
    // Generate new verification token
    const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    // Send verification email
    try {
      const { sendMail } = require('../../utils/mailer');
      await sendMail({
        to: email,
        subject: 'Verify Your Email - All4You Auctions',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">📧 Verify Your Email Address</h2>
            <p>Hello ${user.name || email},</p>
            <p>Please click the button below to verify your email address and complete your registration:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ✅ Verify Email Address
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${verificationUrl}
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              This verification link will expire in 24 hours. If you didn't request this, please ignore this email.
            </p>
            
            <p>Best regards,<br><strong>All4You Auctions Team</strong></p>
          </div>
        `,
        text: `
Verify Your Email - All4You Auctions

Hello ${user.name || email},

Please visit the following link to verify your email address:
${verificationUrl}

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

- All4You Auctions Team
        `
      });
      
      res.json({ message: 'Verification email sent successfully. Please check your inbox.' });
      
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Test endpoint to verify deployment
router.get('/test-deployment', (req, res) => {
  res.json({ 
    status: 'deployed', 
    timestamp: new Date().toISOString(),
    message: 'Direct verify-admin implementation deployed',
    version: '4.1',
    endpoints: {
      'GET /auth/session': 'available',
      'GET /auth/verify-admin': 'direct implementation', 
      'POST /auth/verify-admin': 'direct implementation',
      'POST /auth/verify-email': 'email verification',
      'POST /auth/resend-verification': 'resend verification email'
    }
  });
});

module.exports = router;