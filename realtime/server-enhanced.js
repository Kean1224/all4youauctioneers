require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('./cors-config');
const EnhancedWebSocketService = require('./utils/enhanced-websocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || process.env.REALTIME_PORT || 5001;

// Apply CORS for HTTP endpoints
app.use(cors);
app.use(express.json());

// Initialize enhanced WebSocket service
const wsService = new EnhancedWebSocketService(server);

// Enhanced health check with detailed metrics
app.get('/health', (req, res) => {
  const stats = wsService.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Enhanced Realtime WebSocket Service',
    version: '2.0.0',
    ...stats
  });
});

// WebSocket statistics endpoint
app.get('/stats', (req, res) => {
  const stats = wsService.getStats();
  res.json({
    success: true,
    statistics: stats,
    timestamp: new Date().toISOString()
  });
});

// API endpoint for sending notifications
app.post('/api/notify', (req, res) => {
  const { userEmail, data } = req.body;
  
  if (!data) {
    return res.status(400).json({
      success: false,
      error: 'Message data is required'
    });
  }

  if (userEmail) {
    // Send to specific user
    const client = wsService.clients.get(userEmail);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN = 1
      const success = wsService.sendToClient(client.ws, data);
      res.json({
        success: success,
        sent: success ? 1 : 0,
        target: userEmail
      });
    } else {
      res.json({
        success: false,
        error: 'User not connected',
        target: userEmail
      });
    }
  } else {
    // Broadcast to all connected clients
    let sent = 0;
    let failed = 0;
    
    for (const [email, client] of wsService.clients.entries()) {
      if (wsService.sendToClient(client.ws, data)) {
        sent++;
      } else {
        failed++;
      }
    }
    
    console.log(`📢 Broadcast sent to ${sent} clients, ${failed} failed`);
    res.json({
      success: true,
      sent: sent,
      failed: failed,
      total: sent + failed
    });
  }
});

// API endpoint for bid updates
app.post('/api/bid-update', (req, res) => {
  const { auctionId, lotId, ...bidData } = req.body;
  
  if (!auctionId) {
    return res.status(400).json({
      success: false,
      error: 'Auction ID is required'
    });
  }

  const message = {
    type: 'bid_update',
    auctionId,
    lotId,
    ...bidData,
    timestamp: new Date().toISOString()
  };

  const result = wsService.broadcastToAuction(auctionId, message);
  
  console.log(`💰 Bid update for auction ${auctionId}: ${result.sent} sent, ${result.failed} failed`);
  
  res.json({
    success: true,
    ...result,
    auctionId,
    lotId
  });
});

// API endpoint for timer updates
app.post('/api/timer-update', (req, res) => {
  const { auctionId, ...timerData } = req.body;
  
  if (!auctionId) {
    return res.status(400).json({
      success: false,
      error: 'Auction ID is required'
    });
  }

  const message = {
    type: 'timer_update',
    auctionId,
    ...timerData,
    timestamp: new Date().toISOString()
  };

  const result = wsService.broadcastToAuction(auctionId, message);
  
  console.log(`⏰ Timer update for auction ${auctionId}: ${result.sent} sent, ${result.failed} failed`);
  
  res.json({
    success: true,
    ...result,
    auctionId
  });
});

// API endpoint for auction updates
app.post('/api/auction-update', (req, res) => {
  const { auctionId, ...updateData } = req.body;
  
  if (!auctionId) {
    return res.status(400).json({
      success: false,
      error: 'Auction ID is required'
    });
  }

  const message = {
    type: 'auction_update',
    auctionId,
    ...updateData,
    timestamp: new Date().toISOString()
  };

  const result = wsService.broadcastToAuction(auctionId, message);
  
  console.log(`📋 Auction update for auction ${auctionId}: ${result.sent} sent, ${result.failed} failed`);
  
  res.json({
    success: true,
    ...result,
    auctionId
  });
});

// API endpoint to get connection details
app.get('/api/connections', (req, res) => {
  const connections = [];
  
  for (const [email, client] of wsService.clients.entries()) {
    connections.push({
      email: email,
      connectionId: client.ws.id,
      lastSeen: new Date(client.lastSeen).toISOString(),
      subscriptions: Array.from(client.subscriptions),
      isAlive: client.ws.isAlive,
      readyState: client.ws.readyState
    });
  }
  
  res.json({
    success: true,
    connections: connections,
    total: connections.length
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📶 Received SIGTERM, gracefully shutting down...');
  
  // Close all WebSocket connections
  for (const [email, client] of wsService.clients.entries()) {
    client.ws.close(1001, 'Server shutdown');
  }
  
  server.close(() => {
    console.log('👋 Enhanced realtime service shut down gracefully');
    process.exit(0);
  });
});

// Start the enhanced realtime server
server.listen(PORT, () => {
  console.log(`🚀 Enhanced Realtime WebSocket Service running on port ${PORT}`);
  console.log('✅ Real-time bidding system ready with enhanced stability');
  console.log('🔗 WebSocket server accepting connections');
  console.log('💓 Health monitoring and auto-cleanup active');
  console.log('🛡️ Connection verification and security enabled');
});

module.exports = { server, wsService };