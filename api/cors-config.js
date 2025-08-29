const cors = require('cors');

// Environment-specific CORS configuration
const corsConfig = {
  production: [
    'https://www.all4youauctions.co.za',
    'https://all4youauctions.co.za',
    'https://all4youauctioneers.onrender.com'
  ],
  development: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002'
  ]
};

const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? corsConfig.production 
  : [...corsConfig.production, ...corsConfig.development];

module.exports = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
});

