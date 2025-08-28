const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Use a strong secret in production!
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  console.error('Generate a strong secret with: openssl rand -base64 64');
  throw new Error('JWT_SECRET environment variable is required');
}

// Admin credentials - load from environment variables
const ADMIN_CREDENTIALS = [
  { 
    email: process.env.ADMIN_EMAIL || 'admin@all4youauctions.com', 
    password: process.env.ADMIN_PASSWORD || (() => {
      console.error('🚨 CRITICAL: ADMIN_PASSWORD environment variable not set!');
      throw new Error('ADMIN_PASSWORD environment variable is required');
    })()
  }
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { email, password } = req.body;
  
  // Find admin by email
  const admin = ADMIN_CREDENTIALS.find(a => a.email === email);
  
  let isValid = false;
  if (admin) {
    try {
      // Check if password is already hashed
      if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
        // Use bcrypt to compare hashed password
        isValid = await bcrypt.compare(password, admin.password);
      } else {
        // Plain text comparison - hash it for future use
        isValid = admin.password === password;
        if (isValid) {
          // Hash the password for future use (optional optimization)
          const hashedPassword = await bcrypt.hash(admin.password, 12);
          admin.password = hashedPassword;
          console.log(`[SECURITY] Admin password for ${email} has been hashed for future use`);
        }
      }
    } catch (error) {
      console.error('Error comparing admin password:', error);
      isValid = false;
    }
  }
  if (isValid) {
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
      email, 
      role: 'admin',
      iat: issuedAt
    }, SECRET, { expiresIn: '4h' });
    
    return res.json({ 
      token, 
      email,
      expiresAt: issuedAt + (4 * 60 * 60), // 4 hours from now
      message: 'Admin login successful'
    });
  } else {
    // Security logging for failed attempts
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_LOGIN_FAILED`, {
      email: email || 'unknown',
      ip: clientIP,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};
