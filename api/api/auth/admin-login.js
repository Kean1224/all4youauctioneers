const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbManager = require('../../database/connection');

// Use a strong secret in production!
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  console.error('Generate a strong secret with: openssl rand -base64 64');
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Find admin user in database
    const result = await dbManager.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    
    let isValid = false;
    let admin = null;
    
    if (result.rows.length > 0) {
      admin = result.rows[0];
      
      try {
        // Compare password using bcrypt
        isValid = await bcrypt.compare(password, admin.password_hash);
      } catch (error) {
        console.error('Error comparing admin password:', error);
        isValid = false;
      }
    }
    
    if (isValid && admin) {
    // Security logging
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_LOGIN_SUCCESS`, {
      email,
      ip: clientIP,
      userAgent: req.headers['user-agent']
    });

    // Issue JWT with issued at timestamp
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = jwt.sign({ 
      id: admin.id,
      email: admin.email, 
      name: admin.name,
      role: admin.role, // Use role from database
      iat: issuedAt
    }, SECRET, { expiresIn: '4h' });
    
      // Set JWT as httpOnly, secure cookie with proper domain
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' for cross-subdomain
        domain: process.env.NODE_ENV === 'production' ? '.all4youauctions.co.za' : undefined, // Allow cross-subdomain
        path: '/', // Ensure cookie is available for all paths
        maxAge: 4 * 60 * 60 * 1000 // 4 hours
      });
      return res.json({ 
        email: admin.email,
        name: admin.name,
        role: admin.role,
        token: token, // DIRECT TOKEN APPROACH - return token in response
        expiresAt: issuedAt + (4 * 60 * 60), // 4 hours from now
        message: 'Admin login successful'
      });
    } else {
      // Security logging for failed attempts
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
      console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_LOGIN_FAILED`, {
        email: email || 'unknown',
        reason: admin ? 'invalid_password' : 'admin_not_found',
        ip: clientIP,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    
    // Security logging for errors
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_LOGIN_ERROR`, {
      email: email || 'unknown',
      error: error.message,
      ip: clientIP,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(500).json({ error: 'Admin login failed. Please try again.' });
  }
};
