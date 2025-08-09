const jwt = require('jsonwebtoken');

// Use a strong secret in production!
const SECRET = process.env.JWT_SECRET || 'dev_secret_key';


// Allow multiple admin credentials
const ADMIN_CREDENTIALS = [
  { email: 'Keanmartin75@gmail.com', password: 'Tristan@89' },
  { email: 'admin@admin.com', password: 'admin123' }
];

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { email, password } = req.body;
  const isValid = ADMIN_CREDENTIALS.some(
    (admin) => admin.email === email && admin.password === password
  );
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
