const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  console.error('Generate a strong secret with: openssl rand -base64 64');
  throw new Error('JWT_SECRET environment variable is required');
}

function authenticateToken(req, res, next) {
  // Check for token in cookies first, then authorization header
  const token = req.cookies?.jwt || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
}

// Simple admin verification using role from JWT token
function verifyAdmin(req, res, next) {
  // First authenticate the token
  authenticateToken(req, res, (err) => {
    if (err) return;
    
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ error: 'No role information found' });
      }
      
      // Use proper role-based authorization (removed hardcoded email backdoor)
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      
      next();
    } catch (error) {
      console.error('Admin verification error:', error);
      return res.status(500).json({ error: 'Authorization verification failed' });
    }
  });
}

module.exports = {
  authenticateToken,
  verifyAdmin
};
