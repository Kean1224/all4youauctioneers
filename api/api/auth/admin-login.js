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

// Emergency password update endpoint
async function updateAdminPassword(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const dbManager = require('../../database/connection');
    const correctPasswordHash = '$2b$12$vh2P2zU09274LMdsK5E7/.g.51J/9fMiroMS8YfMsMpWYkJsdU94y';
    
    console.log('🚨 EMERGENCY: Updating admin password hash...');
    
    const result = await dbManager.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 AND role = $3 RETURNING id, email',
      [correctPasswordHash, 'admin@all4youauctions.co.za', 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password hash updated successfully');
      return res.json({ success: true, message: 'Password hash updated' });
    } else {
      console.log('❌ No admin user found to update');
      return res.status(404).json({ error: 'Admin user not found' });
    }
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    return res.status(500).json({ error: 'Update failed' });
  }
}

module.exports = async (req, res) => {
  // Check if this is the emergency password update
  if (req.url === '/update-password' || req.body.action === 'update-password') {
    return updateAdminPassword(req, res);
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    console.log(`🔐 ADMIN LOGIN ATTEMPT: ${email}`);
    console.log(`📧 Email received: ${email}`);
    console.log(`🔑 Password received: ${password}`);
    
    // Find admin user in database
    console.log(`🗄️ Searching for admin user in database...`);
    const result = await dbManager.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    
    console.log(`📋 Database query result: ${result.rows.length} rows found`);
    
    let isValid = false;
    let admin = null;
    
    if (result.rows.length > 0) {
      admin = result.rows[0];
      console.log(`👤 Found admin user:`, {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        hasPasswordHash: !!admin.password_hash
      });
      
      try {
        // Compare password using bcrypt
        console.log(`🔐 Comparing password...`);
        isValid = await bcrypt.compare(password, admin.password_hash);
        console.log(`🔍 Password comparison result: ${isValid}`);
      } catch (error) {
        console.error('❌ Error comparing admin password:', error);
        isValid = false;
      }
    } else {
      console.log(`❌ No admin user found with email: ${email}`);
      
      // Let's also check if user exists with different role
      const userCheck = await dbManager.query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [email]
      );
      console.log(`🔍 User check (any role): ${userCheck.rows.length} rows found`);
      if (userCheck.rows.length > 0) {
        console.log(`👤 Found user with different role:`, userCheck.rows[0]);
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
