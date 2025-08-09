const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Security log function
const logSecurityEvent = (event, details) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp}: ${event}`, details);
};

// Real admin JWT verification middleware
module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
  
  if (!token) {
    logSecurityEvent('ADMIN_ACCESS_DENIED', { reason: 'No token provided', ip: clientIP });
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      logSecurityEvent('ADMIN_TOKEN_INVALID', { 
        reason: err.message, 
        ip: clientIP,
        token: token.substring(0, 20) + '...' 
      });
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!user || user.role !== 'admin') {
      logSecurityEvent('ADMIN_ROLE_MISMATCH', { 
        user: user?.email || 'unknown',
        role: user?.role || 'none',
        ip: clientIP 
      });
      return res.status(401).json({ error: 'Unauthorized: Admin access required' });
    }

    // Check token age (additional security)
    const tokenAge = Date.now() / 1000 - user.iat;
    if (tokenAge > 4 * 60 * 60) { // 4 hours max
      logSecurityEvent('ADMIN_TOKEN_EXPIRED', { 
        user: user.email,
        tokenAge: Math.floor(tokenAge / 60) + ' minutes',
        ip: clientIP 
      });
      return res.status(401).json({ error: 'Token expired - please login again' });
    }

    // Success - log access
    logSecurityEvent('ADMIN_ACCESS_GRANTED', { 
      user: user.email,
      path: req.path || 'unknown',
      method: req.method || 'unknown',
      ip: clientIP 
    });

    req.user = user;
    
    if (typeof next === 'function') return next();
    // For direct calls (no next), return success
    return res.json({ 
      ok: true, 
      user: { email: user.email, role: user.role },
      expiresAt: user.exp 
    });
  });
};
