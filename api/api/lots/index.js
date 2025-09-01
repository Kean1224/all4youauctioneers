const verifyAdmin = require('../auth/verify-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Enhanced WebSocket notifications for real-time bidding
let wsNotify = null;
let sendBidUpdate = null;
let sendTimerUpdate = null;
let sendAuctionUpdate = null;

try {
  const realtimeClient = require('../../utils/realtime-client');
  wsNotify = realtimeClient.sendNotification;
  sendBidUpdate = realtimeClient.sendBidUpdate;
  sendTimerUpdate = realtimeClient.sendTimerUpdate;
  sendAuctionUpdate = realtimeClient.sendAuctionUpdate;
  console.log('✅ Real-time WebSocket bidding system loaded');
} catch (e) {
  console.log('⚠️  WebSocket server not available for lot notifications');
}

const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../../middleware/auth');
const dbModels = require('../../database/models');

// Email notifications (with error handling)
let sendMail = null;
let sendBidConfirmation = null;
let sendOutbidNotification = null;
try {
  const mailerModule = require('../../utils/mailer');
  const auctionEmailModule = require('../../utils/auctionEmailTemplates');
  sendMail = mailerModule.sendMail;
  sendBidConfirmation = auctionEmailModule.sendBidConfirmation;
  sendOutbidNotification = auctionEmailModule.sendOutbidNotification;
  console.log('✅ Email service and auction templates loaded');
} catch (e) {
  console.log('⚠️  Email service not available:', e.message);
  // Create mock functions that don't throw errors
  sendMail = async (options) => {
    console.log(`📧 Mock email to ${options.to}: ${options.subject}`);
    return Promise.resolve();
  };
  sendBidConfirmation = async () => Promise.resolve();
  sendOutbidNotification = async () => Promise.resolve();
}

const router = express.Router();

// Helper function to calculate time remaining
const calculateTimeRemaining = (endTime) => {
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return null;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// ✅ POST: End auction with per-lot stagger and sniper protection (admin only)
router.post('/:auctionId/end', verifyAdmin, async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    // Get auction from database
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Get all lots for this auction
    const lots = await dbModels.getLotsByAuctionId(auctionId);
    
    // Set up per-lot end times: first lot ends now, next ends 10s later, etc.
    const now = Date.now();
    let notifications = [];
    let lotEndTimes = [];
    
    for (let idx = 0; idx < lots.length; idx++) {
      const lot = lots[idx];
      // If lot already ended, skip
      if (lot.status === 'ended') continue;
      
      // Set or update endTime for each lot
      const endTime = new Date(now + idx * 10000).toISOString();
      
      await dbModels.updateLot(lot.id, {
        end_time: endTime,
        status: 'scheduled'
      });
      
      lotEndTimes.push({ lotId: lot.id, endTime: endTime });
    }

    // TODO: Implement complex lot ending with sniper protection and automatic invoicing
    // For now, just return basic confirmation that lots have been scheduled
    
    res.json({ 
      message: 'Auction lots scheduled to end with database-based stagger timing.', 
      lotEndTimes 
    });

  } catch (error) {
    console.error('Error ending auction:', error);
    res.status(500).json({ error: 'Failed to end auction' });
  }
});
// JSON file operations removed - all data now handled via PostgreSQL database

// Multer setup for memory storage (images will be stored in PostgreSQL)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ✅ GET lots for auction
router.get('/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    // Get auction from database
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Get lots with bid history from database
    let lots = await dbModels.getLotsWithBidHistory(auctionId);
    
    // Transform database format to frontend format
    const transformedLots = lots.map(lot => ({
      id: lot.id,
      title: lot.title || 'Untitled Lot',
      description: lot.description || '',
      startPrice: parseFloat(lot.starting_bid) || 0,
      startingPrice: parseFloat(lot.starting_bid) || 0, // Frontend expects this field
      currentBid: parseFloat(lot.current_bid) || parseFloat(lot.starting_bid) || 0,
      bidIncrement: parseFloat(lot.bid_increment) || 10,
      image: lot.image_urls && lot.image_urls.length > 0 ? lot.image_urls[0] : '',
      imageUrl: lot.image_urls && lot.image_urls.length > 0 ? lot.image_urls[0] : '', // Fallback field
      images: lot.image_urls || [],
      bidHistory: lot.bidHistory || [],
      endTime: lot.end_time,
      lotNumber: lot.lot_number || 0,
      sellerEmail: lot.seller_email || null,
      condition: lot.condition || 'Good',
      createdAt: lot.created_at,
      status: lot.status || 'active',
      bid_count: parseInt(lot.bid_count) || 0
    }));
    
    res.json({ lots: transformedLots });
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// ✅ POST: Add a new lot to an auction
router.post('/:auctionId', verifyAdmin, upload.any(), async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { title, description, startPrice, bidIncrement, endTime, sellerEmail, condition } = req.body;
    
    console.log('🔍 DEBUG - Lot creation request received:');
    console.log('📋 Body data:', { title, description, startPrice, bidIncrement, endTime, sellerEmail, condition });
    console.log('📁 Files:', req.files?.length || 0);
    
    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!startPrice || isNaN(parseFloat(startPrice)) || parseFloat(startPrice) <= 0) {
      return res.status(400).json({ error: 'Valid starting price is required' });
    }
    
    // Handle multiple images - store in PostgreSQL
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      console.log('📄 Files received for lot:', req.files.map(f => ({ fieldname: f.fieldname, filename: f.originalname })));
      for (const file of req.files) {
        if (file.fieldname.includes('image') || file.fieldname === 'images') {
          const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          imageUrls.push(imageUrl);
        }
      }
      console.log('🖼️ Processed', imageUrls.length, 'images for lot');
    }

    // Get auction to check if it exists
    const auction = await dbModels.getAuctionWithLots(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Find the highest lotNumber in this auction
    let maxLotNumber = 0;
    if (auction.lots) {
      auction.lots.forEach(lot => {
        if (typeof lot.lot_number === 'number' && lot.lot_number > maxLotNumber) {
          maxLotNumber = lot.lot_number;
        }
      });
    }
    
    // Create staggered end time if not provided
    let lotEndTime = endTime;
    if (!lotEndTime) {
      const now = new Date();
      const minutesToAdd = 5 + maxLotNumber;
      lotEndTime = new Date(now.getTime() + minutesToAdd * 60 * 1000).toISOString();
      console.log(`📅 Auto-scheduled lot ${maxLotNumber + 1} to end at: ${new Date(lotEndTime).toLocaleString()}`);
    }
    
    // Ensure numeric values are properly parsed
    const startingBid = parseFloat(startPrice);
    const increment = parseFloat(bidIncrement) || 10;
    
    const newLotData = {
      auction_id: auctionId,
      title: title.trim(),
      description: description ? description.trim() : '',
      starting_bid: startingBid,
      current_bid: startingBid,
      bid_increment: increment,
      image_urls: imageUrls,
      seller_email: sellerEmail || null,
      condition: condition || 'Good',
      lot_number: maxLotNumber + 1,
      end_time: lotEndTime
    };
    
    console.log('💾 Creating lot with data:', newLotData);
    
    const createdLot = await dbModels.createLot(newLotData);
    
    console.log('✅ Created lot:', createdLot);
    
    // Format response to match expected format - ensuring all fields are included
    const responseData = {
      id: createdLot.id,
      title: createdLot.title,
      description: createdLot.description || '',
      startPrice: parseFloat(createdLot.starting_bid),
      startingPrice: parseFloat(createdLot.starting_bid), // Frontend expects this field
      currentBid: parseFloat(createdLot.current_bid || createdLot.starting_bid),
      bidIncrement: parseFloat(createdLot.bid_increment),
      image: (createdLot.image_urls && createdLot.image_urls.length > 0) ? createdLot.image_urls[0] : '',
      imageUrl: (createdLot.image_urls && createdLot.image_urls.length > 0) ? createdLot.image_urls[0] : '', // Fallback field
      images: createdLot.image_urls || [],
      bidHistory: [],
      endTime: createdLot.end_time,
      createdAt: createdLot.created_at,
      sellerEmail: createdLot.seller_email,
      lotNumber: createdLot.lot_number,
      condition: createdLot.condition || 'Good',
      status: createdLot.status || 'active',
      bid_count: 0
    };
    
    console.log('📤 Sending response:', responseData);
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ Error creating lot:', error);
    res.status(500).json({ error: 'Failed to create lot: ' + error.message });
  }
});

// ✅ PUT: Update a lot
router.put('/:auctionId/:lotId', async (req, res) => {
  try {
    const { auctionId, lotId } = req.params;
    
    // Check if auction exists
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Update the lot using database
    const updateData = {
      ...req.body,
      condition: req.body.condition || 'Good'
    };

    const updatedLot = await dbModels.updateLot(lotId, updateData);
    if (!updatedLot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    res.json(updatedLot);
  } catch (error) {
    console.error('Error updating lot:', error);
    res.status(500).json({ error: 'Failed to update lot' });
  }
});

// ✅ DELETE: Remove a lot
router.delete('/:auctionId/:lotId', async (req, res) => {
  try {
    const { auctionId, lotId } = req.params;
    
    // Check if auction exists
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Delete the lot from database
    const deletedLot = await dbModels.deleteLot(lotId);
    if (!deletedLot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    res.json({ message: 'Lot deleted successfully' });
  } catch (error) {
    console.error('Error deleting lot:', error);
    res.status(500).json({ error: 'Failed to delete lot' });
  }
});


// ✅ NEW: Set or update auto-bid for a user on a lot (protected)
router.put('/:auctionId/:lotId/autobid', authenticateToken, async (req, res) => {
  try {
    const { auctionId, lotId } = req.params;
    const { bidderEmail, maxBid } = req.body;
    
    if (!bidderEmail || typeof maxBid !== 'number') {
      return res.status(400).json({ error: 'bidderEmail and maxBid required' });
    }

    // Check if auction exists
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if lot exists
    const lot = await dbModels.getLotById(lotId);
    if (!lot || lot.auction_id !== auctionId) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // ✅ FICA APPROVAL CHECK - User must be approved to set auto-bids
    const user = await dbModels.getUserByEmail(bidderEmail);
    if (!user) {
      return res.status(403).json({ error: 'User not found. Please register to participate in auctions.' });
    }
    
    if (!user.fica_approved) {
      if (user.rejection_reason) {
        return res.status(403).json({ 
          error: 'Your FICA documents were rejected. Please re-upload your documents for approval before setting auto-bids.',
          rejectionReason: user.rejection_reason
        });
      } else {
        return res.status(403).json({ 
          error: 'Your FICA documents are pending approval. You will be able to set auto-bids once approved by our admin team.' 
        });
      }
    }

    if (user.suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    // Set the auto-bid using database method
    await dbModels.setAutoBid(lotId, bidderEmail, maxBid);
    res.json({ message: 'Auto-bid set', maxBid });
    
  } catch (error) {
    console.error('Error setting auto-bid:', error);
    res.status(500).json({ error: 'Failed to set auto-bid' });
  }
});

// ✅ NEW: Get auto-bid status for a user on a lot (protected)
router.get('/:auctionId/:lotId/autobid/:userEmail', authenticateToken, async (req, res) => {
  try {
    const { auctionId, lotId, userEmail } = req.params;
    
    // Check if auction exists
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if lot exists
    const lot = await dbModels.getLotById(lotId);
    if (!lot || lot.auction_id !== auctionId) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    // Get auto-bid from database
    const maxBid = await dbModels.getAutoBid(lotId, userEmail);
    res.json({ maxBid: maxBid || null });
    
  } catch (error) {
    console.error('Error getting auto-bid:', error);
    res.status(500).json({ error: 'Failed to get auto-bid' });
  }
});

// Import atomic operations to prevent race conditions
const atomicData = require('../../utils/atomic-data');

// ✅ Place a bid using database atomic operations (RACE CONDITION SAFE)
router.post('/:lotId/bid', async (req, res) => {
  try {
    const { lotId } = req.params;
    const { bidderEmail, amount, increment } = req.body;

    console.log('🎯 Bid request received:', { lotId, bidderEmail, amount, increment });

    // CRITICAL: Check FICA approval before allowing bidding
    const user = await dbModels.getUserByEmail(bidderEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (!user.fica_approved) {
      return res.status(403).json({ 
        success: false, 
        error: 'FICA approval required before bidding. Please upload required documents.' 
      });
    }

    if (user.suspended) {
      return res.status(403).json({ 
        success: false, 
        error: 'Your account has been suspended. Please contact support.' 
      });
    }

    // Get lot and auction info from database
    const lot = await dbModels.getLotWithBids(lotId);
    if (!lot) {
      return res.status(404).json({ success: false, error: 'Lot not found' });
    }

    const auction = await dbModels.getAuctionById(lot.auction_id);
    if (!auction) {
      return res.status(404).json({ success: false, error: 'Auction not found' });
    }

    const auctionId = auction.id;

    // Check if lot has ended
    if (lot.end_time && new Date() >= new Date(lot.end_time)) {
      return res.status(400).json({ success: false, error: 'This lot has already ended' });
    }

    // Use the bid increment from the request, or fall back to lot's default increment
    const bidIncrement = increment || lot.bid_increment || 10;
    
    // Use the amount provided, or calculate based on current bid + increment
    const newBid = amount || (lot.current_bid + bidIncrement);

    // Use database atomic bid placement to prevent race conditions
    const bidData = {
      lot_id: parseInt(lotId),
      auction_id: auctionId,
      bidder_email: bidderEmail,
      bid_amount: newBid,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    };

    const bidResult = await dbModels.placeBid(bidData);

    console.log('✅ Database atomic bid placement successful:', bidResult.bid);

    // 🚀 REAL-TIME BID UPDATE - Send to all auction subscribers (if WebSocket is available)
    if (typeof sendBidUpdate === 'function') {
      sendBidUpdate(auctionId, lotId, {
        currentBid: bidResult.bid.bid_amount,
        bidderEmail: bidderEmail.substring(0, 3) + '***', // Masked for privacy
        bidAmount: bidResult.bid.bid_amount,
        lotTitle: lot.title,
        timestamp: new Date().toISOString(),
        bidIncrement: bidIncrement,
        nextMinBid: bidResult.bid.bid_amount + bidIncrement
      });
    }

    // TODO: Re-implement auto-bidding, sniper protection, and advanced notifications
    // For now, we have basic bidding working with atomic database operations
    
    res.json({ 
      success: true,
      message: 'Bid placed successfully', 
      currentBid: bidResult.bid.bid_amount,
      newBidAmount: bidResult.bid.bid_amount,
      previousBidder: bidResult.previous_bidder
    });

  } catch (error) {
    console.error('❌ Database bid placement failed:', error.message);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Bid placement failed. Please try again.' 
    });
  }
});

// PUT /:auctionId/:lotId/assign-seller - Assign seller to a lot (admin only)
router.put('/:auctionId/:lotId/assign-seller', verifyAdmin, async (req, res) => {
  try {
    const { auctionId, lotId } = req.params;
    const { sellerEmail } = req.body;

    if (!sellerEmail) {
      return res.status(400).json({ error: 'Seller email is required' });
    }

    // Check if lot exists in the specified auction
    const lot = await dbModels.getLotById(lotId);
    if (!lot || lot.auction_id != auctionId) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Verify seller exists and is not suspended
    const seller = await dbModels.getUserByEmail(sellerEmail);
    if (!seller) {
      return res.status(400).json({ error: 'Seller not found' });
    }

    if (seller.suspended) {
      return res.status(400).json({ error: 'Cannot assign suspended seller' });
    }

    // Assign seller to lot using database
    const updatedLot = await dbModels.updateLot(lotId, {
      seller_email: sellerEmail
    });

    // Log the assignment
    console.log(`[ADMIN] ${req.user?.email || 'admin'} assigned seller ${sellerEmail} to lot ${lotId} in auction ${auctionId}`);

    res.json({
      success: true,
      message: 'Seller assigned successfully',
      lot: updatedLot
    });

  } catch (error) {
    console.error('Error assigning seller to lot:', error);
    res.status(500).json({ error: 'Failed to assign seller' });
  }
});

module.exports = router;

