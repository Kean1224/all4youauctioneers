const WebSocket = require('ws');

/**
 * Enhanced WebSocket Service with Stability Improvements
 * Addresses connection drops and reliability issues
 */
class EnhancedWebSocketService {
  constructor(server) {
    this.server = server;
    this.clients = new Map(); // email -> {ws, lastSeen, subscriptions}
    this.auctionSubscriptions = new Map(); // auctionId -> Set of emails
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      reconnections: 0,
      errors: 0
    };
    
    this.initializeWebSocketServer();
    this.startHealthMonitoring();
  }

  /**
   * Initialize WebSocket server with enhanced configuration
   */
  initializeWebSocketServer() {
    this.wss = new WebSocket.Server({
      server: this.server,
      clientTracking: true,
      perMessageDeflate: {
        // Enable compression for better performance
        zlibDeflateOptions: {
          threshold: 1024, // Only compress if message > 1KB
          concurrencyLimit: 10,
          memLevel: 7
        }
      },
      maxPayload: 16 * 1024, // 16KB max message size
      verifyClient: (info) => this.verifyClient(info)
    });

    this.setupEventHandlers();
    console.log('🚀 Enhanced WebSocket service initialized');
  }

  /**
   * Verify client connections with enhanced security
   */
  verifyClient(info) {
    const origin = info.origin;
    
    // Development mode - allow localhost
    if (process.env.NODE_ENV === 'development') {
      const allowedDevOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002'
      ];
      return !origin || allowedDevOrigins.some(allowed => 
        !origin || origin.startsWith(allowed)
      );
    }
    
    // Production mode - strict origin checking
    const allowedOrigins = [
      'https://www.all4youauctions.co.za',
      'https://all4youauctions.co.za'
    ];
    
    return allowedOrigins.includes(origin);
  }

  /**
   * Set up WebSocket event handlers
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
      this.connectionStats.errors++;
    });
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    ws.id = connectionId;
    ws.isAlive = true;
    ws.lastActivity = Date.now();
    ws.reconnectCount = 0;

    this.connectionStats.totalConnections++;
    this.connectionStats.activeConnections++;

    console.log(`🔗 New WebSocket connection: ${connectionId}`);

    // Set up connection handlers
    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', (code, reason) => this.handleDisconnection(ws, code, reason));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('pong', () => this.handlePong(ws));

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connection_established',
      connectionId: connectionId,
      timestamp: new Date().toISOString(),
      message: 'WebSocket connection established successfully'
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(ws, message) {
    ws.lastActivity = Date.now();
    ws.isAlive = true;

    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register':
          this.handleUserRegistration(ws, data);
          break;
          
        case 'subscribe_auction':
          this.handleAuctionSubscription(ws, data);
          break;
          
        case 'unsubscribe_auction':
          this.handleAuctionUnsubscription(ws, data);
          break;
          
        case 'heartbeat':
        case 'ping':
          this.handleHeartbeat(ws, data);
          break;
          
        case 'reconnect':
          this.handleReconnection(ws, data);
          break;
          
        default:
          console.warn(`⚠️  Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Message parsing error:', error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  /**
   * Handle user registration
   */
  handleUserRegistration(ws, data) {
    if (!data.email) {
      return this.sendToClient(ws, {
        type: 'error',
        message: 'Email is required for registration'
      });
    }

    // Check if user is already connected
    const existingClient = this.clients.get(data.email);
    if (existingClient && existingClient.ws.readyState === WebSocket.OPEN) {
      // Close old connection
      existingClient.ws.close(1000, 'Duplicate connection');
      console.log(`🔄 Replacing existing connection for: ${data.email}`);
    }

    // Register new client
    ws.email = data.email;
    this.clients.set(data.email, {
      ws: ws,
      lastSeen: Date.now(),
      subscriptions: new Set(),
      reconnectCount: data.reconnectCount || 0
    });

    if (data.reconnectCount) {
      this.connectionStats.reconnections++;
      console.log(`🔄 User reconnected: ${data.email} (attempt ${data.reconnectCount})`);
    } else {
      console.log(`✅ User registered: ${data.email}`);
    }

    this.sendToClient(ws, {
      type: 'registration_confirmed',
      email: data.email,
      connectionId: ws.id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle auction subscription
   */
  handleAuctionSubscription(ws, data) {
    if (!ws.email || !data.auctionId) {
      return this.sendToClient(ws, {
        type: 'error',
        message: 'Must be registered and provide auction ID'
      });
    }

    // Add to auction subscriptions
    if (!this.auctionSubscriptions.has(data.auctionId)) {
      this.auctionSubscriptions.set(data.auctionId, new Set());
    }
    this.auctionSubscriptions.get(data.auctionId).add(ws.email);

    // Update client subscriptions
    const client = this.clients.get(ws.email);
    if (client) {
      client.subscriptions.add(data.auctionId);
    }

    console.log(`📺 ${ws.email} subscribed to auction ${data.auctionId}`);

    this.sendToClient(ws, {
      type: 'auction_subscribed',
      auctionId: data.auctionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle auction unsubscription
   */
  handleAuctionUnsubscription(ws, data) {
    if (!ws.email || !data.auctionId) return;

    if (this.auctionSubscriptions.has(data.auctionId)) {
      this.auctionSubscriptions.get(data.auctionId).delete(ws.email);
    }

    const client = this.clients.get(ws.email);
    if (client) {
      client.subscriptions.delete(data.auctionId);
    }

    console.log(`📺 ${ws.email} unsubscribed from auction ${data.auctionId}`);

    this.sendToClient(ws, {
      type: 'auction_unsubscribed',
      auctionId: data.auctionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle heartbeat/ping messages
   */
  handleHeartbeat(ws, data) {
    ws.isAlive = true;
    ws.lastActivity = Date.now();
    
    this.sendToClient(ws, {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
  }

  /**
   * Handle reconnection attempts
   */
  handleReconnection(ws, data) {
    if (data.email && data.previousConnectionId) {
      ws.reconnectCount = (data.reconnectCount || 0) + 1;
      console.log(`🔄 Reconnection attempt from ${data.email}: ${ws.reconnectCount}`);
      
      // Re-register the user
      this.handleUserRegistration(ws, {
        email: data.email,
        reconnectCount: ws.reconnectCount
      });
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnection(ws, code, reason) {
    this.connectionStats.activeConnections--;
    
    console.log(`❌ WebSocket disconnection: ${ws.id} (code: ${code}, reason: ${reason})`);

    if (ws.email) {
      // Remove from all auction subscriptions
      for (const [auctionId, subscribers] of this.auctionSubscriptions.entries()) {
        subscribers.delete(ws.email);
      }

      // Remove client
      this.clients.delete(ws.email);
      console.log(`👋 User disconnected: ${ws.email}`);
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(ws, error) {
    console.error(`❌ WebSocket error (${ws.id}):`, error.message);
    this.connectionStats.errors++;
  }

  /**
   * Handle pong response
   */
  handlePong(ws) {
    ws.isAlive = true;
    ws.lastActivity = Date.now();
  }

  /**
   * Send message to specific client with error handling
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Broadcast to auction subscribers
   */
  broadcastToAuction(auctionId, data) {
    if (!this.auctionSubscriptions.has(auctionId)) {
      return { sent: 0, failed: 0 };
    }

    const subscribers = this.auctionSubscriptions.get(auctionId);
    let sent = 0;
    let failed = 0;

    for (const email of subscribers) {
      const client = this.clients.get(email);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        if (this.sendToClient(client.ws, data)) {
          sent++;
        } else {
          failed++;
        }
      } else {
        // Clean up stale subscription
        subscribers.delete(email);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Start health monitoring and cleanup
   */
  startHealthMonitoring() {
    // Ping all connections every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Clean up stale connections every 60 seconds
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000);

    console.log('💓 Health monitoring started');
  }

  /**
   * Perform health check on all connections
   */
  performHealthCheck() {
    const now = Date.now();
    let aliveCount = 0;
    let staleCount = 0;

    for (const [email, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Mark as not alive, will be reset by pong
        client.ws.isAlive = false;
        
        // Send ping
        try {
          client.ws.ping();
          client.lastSeen = now;
          aliveCount++;
        } catch (error) {
          console.error(`❌ Ping failed for ${email}:`, error);
          staleCount++;
        }
      } else {
        staleCount++;
      }
    }

    console.log(`💓 Health check: ${aliveCount} alive, ${staleCount} stale`);
  }

  /**
   * Clean up stale and dead connections
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    let cleaned = 0;

    for (const [email, client] of this.clients.entries()) {
      const isStale = (now - client.lastSeen) > staleThreshold;
      const isDead = client.ws.readyState !== WebSocket.OPEN;
      const notResponding = !client.ws.isAlive;

      if (isStale || isDead || notResponding) {
        // Clean up subscriptions
        for (const [auctionId, subscribers] of this.auctionSubscriptions.entries()) {
          subscribers.delete(email);
        }

        // Close connection if still open
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1001, 'Connection cleanup');
        }

        // Remove client
        this.clients.delete(email);
        cleaned++;
        
        console.log(`🧹 Cleaned up stale connection: ${email}`);
      }
    }

    if (cleaned > 0) {
      this.connectionStats.activeConnections = this.clients.size;
      console.log(`🧹 Cleanup completed: removed ${cleaned} stale connections`);
    }
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      activeConnections: this.clients.size,
      totalAuctions: this.auctionSubscriptions.size,
      uptime: process.uptime()
    };
  }
}

module.exports = EnhancedWebSocketService;