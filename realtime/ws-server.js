const WebSocket = require('ws');

// WebSocket server will be attached to the main Express server
let wss = null;

function createWebSocketServer(server) {
  wss = new WebSocket.Server({ 
    server,
    // Allow connections from anywhere in development, validate in production
    verifyClient: (info) => {
      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
      // In production, validate origin
      const origin = info.origin;
      const allowedOrigins = [
        'https://www.all4youauctions.co.za',
        'https://all4youauctions.co.za',
        'http://localhost:3000' // For local testing
      ];
      
      return allowedOrigins.includes(origin);
    }
  });
  
  setupWebSocketHandlers();
  return wss;
}

function setupWebSocketHandlers() {
  if (!wss) return;

  // Track clients by email and auction subscriptions
  const clients = new Map();
  const auctionSubscriptions = new Map(); // auctionId -> Set of client emails

    wss.on('connection', (ws, req) => {
      console.log('🔗 New WebSocket connection established');
      
      ws.on('message', msg => {
        try {
          const data = JSON.parse(msg);
          
          if (data.type === 'register' && data.email) {
            clients.set(data.email, ws);
            ws.email = data.email;
            console.log(`✅ User registered: ${data.email}`);
            
            // Send welcome message
            ws.send(JSON.stringify({
              type: 'connection_confirmed',
              message: 'Real-time bidding connected successfully!'
            }));
          }
          
          if (data.type === 'subscribe_auction' && data.auctionId && ws.email) {
            if (!auctionSubscriptions.has(data.auctionId)) {
              auctionSubscriptions.set(data.auctionId, new Set());
            }
            auctionSubscriptions.get(data.auctionId).add(ws.email);
            console.log(`📺 User ${ws.email} subscribed to auction ${data.auctionId}`);
            
            // Send subscription confirmation
            ws.send(JSON.stringify({
              type: 'auction_subscribed',
              auctionId: data.auctionId,
              message: `Subscribed to live updates for auction ${data.auctionId}`
            }));
          }
          
          if (data.type === 'unsubscribe_auction' && data.auctionId && ws.email) {
            if (auctionSubscriptions.has(data.auctionId)) {
              auctionSubscriptions.get(data.auctionId).delete(ws.email);
              console.log(`📺 User ${ws.email} unsubscribed from auction ${data.auctionId}`);
            }
          }
          
          if (data.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          }
          
        } catch (e) {
          console.error('WebSocket message parsing error:', e);
        }
      });
      
      ws.on('close', () => {
        if (ws.email) {
          clients.delete(ws.email);
          // Remove from all auction subscriptions
          for (const [auctionId, subscribers] of auctionSubscriptions.entries()) {
            subscribers.delete(ws.email);
          }
          console.log(`❌ User disconnected: ${ws.email}`);
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Heartbeat to keep connections alive
    setInterval(() => {
      for (const [email, ws] of clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clients.delete(email);
        }
      }
    }, 30000); // Every 30 seconds

    return {
      sendNotification: (email, payload) => {
        if (email && clients.has(email)) {
          const ws = clients.get(email);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
            return true;
          }
        } else if (!email) {
          // Broadcast to all connected clients
          let sent = 0;
          for (const ws of clients.values()) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(payload));
              sent++;
            }
          }
          console.log(`📢 Broadcast message sent to ${sent} clients`);
          return sent > 0;
        }
        return false;
      },
      
      sendBidUpdate: (auctionId, lotId, bidData) => {
        if (auctionSubscriptions.has(auctionId)) {
          const subscribers = auctionSubscriptions.get(auctionId);
          let sent = 0;
          
          for (const email of subscribers) {
            if (clients.has(email)) {
              const ws = clients.get(email);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'bid_update',
                  auctionId,
                  lotId,
                  ...bidData,
                  timestamp: new Date().toISOString()
                }));
                sent++;
              }
            }
          }
          
          console.log(`💰 Bid update sent to ${sent} subscribers for auction ${auctionId}, lot ${lotId}`);
          return sent;
        }
        return 0;
      },
      
      getConnectionStats: () => ({
        totalConnections: clients.size,
        auctionSubscriptions: Object.fromEntries(
          Array.from(auctionSubscriptions.entries()).map(([auctionId, subscribers]) => [
            auctionId,
            subscribers.size
          ])
        )
      })
    };
}

// Module exports
module.exports = {
  createWebSocketServer,
  
  // Legacy support functions (will be no-ops until WebSocket is properly integrated)
  sendNotification: () => false,
  sendBidUpdate: () => 0,
  sendTimerUpdate: () => 0,
  sendAuctionUpdate: () => 0,
  getConnectionStats: () => ({ totalConnections: 0, auctionSubscriptions: {} })
};
