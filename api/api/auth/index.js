const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  console.error('Generate a strong secret with: openssl rand -base64 64');
  throw new Error('JWT_SECRET environment variable is required');
}
// Removed usersPath - now using PostgreSQL database

// POST /api/auth/login - User login endpoint (MIGRATED TO POSTGRESQL)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get user from PostgreSQL database
    const dbModels = require('../../database/models');
    const user = await dbModels.getUserByEmail(email);

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

    // Check password using bcrypt (passwords are now stored hashed in PostgreSQL)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
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
      ficaApproved: user.fica_approved,
      suspended: user.suspended,
      expiresAt: issuedAt + (24 * 60 * 60), // 24 hours from now
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
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
  const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  console.error('Generate a strong secret with: openssl rand -base64 64');
  throw new Error('JWT_SECRET environment variable is required');
}
  
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
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { email } = decoded;
    
    // Find the user in PostgreSQL database
    const dbModels = require('../../database/models');
    const user = await dbModels.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Mark as verified in PostgreSQL
    const updatedUser = await dbModels.updateUser(email, { 
      email_verified: true,
      verified_at: new Date().toISOString()
    });
    
    console.log(`✅ Email verified for user: ${email}`);
    
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
        email: user.email,
        name: user.name,
        ficaApproved: user.fica_approved
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

// POST /api/auth/resend-verification - Resend verification email (MIGRATED TO POSTGRESQL)
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  
  try {
    const dbModels = require('../../database/models');
    const user = await dbModels.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.email_verified) {
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