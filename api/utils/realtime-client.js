// Self-hosted WebSocket Service Client
// Uses local WebSocket service instead of external dependency

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://localhost:5000';

/**
 * Send notification to specific user
 * @param {string} userEmail - User email or null for broadcast
 * @param {object} data - Notification data
 */
const sendNotification = async (userEmail, data) => {
  try {
    const response = await fetch(`${REALTIME_SERVICE_URL}/api/websocket/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, data }),
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`✅ Notification sent to ${userEmail || 'all users'}:`, data.message || data.type);
    return true;
  } catch (error) {
    console.log(`⚠️  Failed to send notification to ${userEmail || 'all users'}:`, error.message);
    return false;
  }
};

/**
 * Send bid update to auction subscribers
 * @param {string} auctionId - Auction ID
 * @param {string} lotId - Lot ID
 * @param {object} bidData - Bid update data
 */
const sendBidUpdate = async (auctionId, lotId, bidData) => {
  try {
    const response = await fetch(`${REALTIME_SERVICE_URL}/api/websocket/bid-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        auctionId, 
        lotId, 
        type: 'bid_update',
        ...bidData 
      }),
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`✅ Bid update sent for auction ${auctionId}, lot ${lotId}:`, bidData);
    return true;
  } catch (error) {
    console.log(`⚠️  Failed to send bid update for auction ${auctionId}, lot ${lotId}:`, error.message);
    return false;
  }
};

/**
 * Send timer update to auction subscribers
 * @param {string} auctionId - Auction ID
 * @param {object} timerData - Timer update data
 */
const sendTimerUpdate = async (auctionId, timerData) => {
  try {
    const response = await fetch(`${REALTIME_SERVICE_URL}/api/websocket/timer-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        auctionId,
        type: 'timer_update',
        ...timerData 
      }),
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`✅ Timer update sent for auction ${auctionId}:`, timerData);
    return true;
  } catch (error) {
    console.log(`⚠️  Failed to send timer update for auction ${auctionId}:`, error.message);
    return false;
  }
};

/**
 * Send auction update to subscribers
 * @param {string} auctionId - Auction ID
 * @param {object} updateData - Auction update data
 */
const sendAuctionUpdate = async (auctionId, updateData) => {
  try {
    const response = await fetch(`${REALTIME_SERVICE_URL}/api/websocket/auction-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        auctionId,
        type: 'auction_update',
        ...updateData 
      }),
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`✅ Auction update sent for auction ${auctionId}:`, updateData);
    return true;
  } catch (error) {
    console.log(`⚠️  Failed to send auction update for auction ${auctionId}:`, error.message);
    return false;
  }
};

/**
 * Check if realtime service is available
 */
const checkRealtimeService = async () => {
  try {
    const response = await fetch(`${REALTIME_SERVICE_URL}/health`, {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

module.exports = {
  sendNotification,
  sendBidUpdate,
  sendTimerUpdate,
  sendAuctionUpdate,
  checkRealtimeService
};