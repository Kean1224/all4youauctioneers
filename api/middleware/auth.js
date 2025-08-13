const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  console.error('Generate a strong secret with: openssl rand -base64 64');
  process.exit(1);
})();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
