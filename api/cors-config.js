const cors = require('cors');

module.exports = cors({
  origin: [
    // Development URLs
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    // Render deployment URLs
    'https://all4you-frontend.onrender.com',
    'https://all4you-backend.onrender.com',
    // Legacy Render URLs (keep for compatibility)
    'https://groot-cvb5.onrender.com',
    'https://groot-1.onrender.com',
    'https://groot-2.onrender.com',
    'https://groot-frontend.onrender.com',
    // Custom domain URLs (if you plan to use custom domains later)
    'https://all4youauctions.co.za',
    'https://www.all4youauctions.co.za',
    'https://api.all4youauctions.co.za'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
});

