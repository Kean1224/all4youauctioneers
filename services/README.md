# All4You Auctioneers - Microservices Architecture

This project has been split into 3 deployable microservices for better scalability and maintainability.

## 🏗️ Services Overview

### 1. Frontend (`/services/frontend/`)
- **Technology**: Next.js 15 + React 19 + TypeScript
- **Purpose**: Static frontend application
- **Deployment**: Vercel, Netlify, or any static hosting
- **Port**: 3000 (development)

### 2. API Gateway (`/services/api/`)
- **Technology**: Express.js + Node.js
- **Purpose**: REST API endpoints, file uploads, authentication
- **Deployment**: Render, Railway, Heroku
- **Port**: 5000

### 3. Realtime Service (`/services/realtime/`)
- **Technology**: WebSocket + Express.js
- **Purpose**: Live auction bidding, real-time notifications
- **Deployment**: Render, Railway, Heroku
- **Port**: 5001

## 🚀 Quick Start

### Development with Docker Compose
```bash
# Start all services
docker-compose up

# Access services:
# Frontend: http://localhost:3000
# API: http://localhost:5000
# Realtime: ws://localhost:5001
```

### Manual Development Setup
```bash
# Terminal 1 - API Gateway
cd services/api
npm install
npm run dev

# Terminal 2 - Realtime Service  
cd services/realtime
npm install
npm run dev

# Terminal 3 - Frontend
cd services/frontend
npm install
npm run dev
```

## 📦 Individual Service Deployment

### Frontend Deployment (Vercel)
```bash
cd services/frontend
vercel --prod
```

### API Gateway Deployment (Render)
- Connect GitHub repo: `/services/api`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `PORT=5000`

### Realtime Service Deployment (Render)
- Connect GitHub repo: `/services/realtime`
- Build Command: `npm install`  
- Start Command: `npm start`
- Environment Variables:
  - `NODE_ENV=production`
  - `REALTIME_PORT=5001`

## 🔧 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-api-gateway.onrender.com
NEXT_PUBLIC_REALTIME_URL=wss://your-realtime-service.onrender.com
```

### API Gateway (.env)
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your_jwt_secret
SMTP_USER=your_email
SMTP_PASS=your_password
```

### Realtime Service (.env)
```
NODE_ENV=production
REALTIME_PORT=5001
```

## 🔄 Service Communication

- **Frontend → API**: HTTP requests via `/api/*` proxy
- **Frontend → Realtime**: WebSocket connection for live updates
- **API → Realtime**: HTTP API calls for triggering notifications

## 📁 File Structure
```
services/
├── frontend/          # Next.js static site
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   └── hooks/         # Custom React hooks
├── api/               # Express.js API gateway
│   ├── api/           # API route handlers
│   ├── middleware/    # Express middleware
│   └── utils/         # Utility functions
└── realtime/          # WebSocket service
    ├── server.js      # WebSocket server
    └── cors-config.js # CORS configuration
```

## 🔒 Security Features

- **API Gateway**: Rate limiting, input sanitization, CORS protection
- **Realtime Service**: Origin validation, connection limits
- **Frontend**: CSP headers, XSS protection

## 🏥 Health Checks

All services expose `/health` endpoints for monitoring:
- API Gateway: `GET /health`
- Realtime Service: `GET /health`
- Frontend: Built-in Next.js health checks

## 📊 Monitoring

Use the stats endpoint to monitor WebSocket connections:
- `GET /api/stats` - Returns connection count and subscription stats