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
  const { auctionId } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  // Set up per-lot end times: first lot ends now, next ends 10s later, etc.
  const now = Date.now();
  let notifications = [];
  let lotEndTimes = [];
  let lots = auction.lots || [];
  lots.forEach((lot, idx) => {
    // If lot already ended, skip
    if (lot.status === 'ended') return;
    // Set or update endTime for each lot
    lot.endTime = new Date(now + idx * 10000).toISOString();
    lot.status = 'scheduled';
    lotEndTimes.push({ lotId: lot.id, endTime: lot.endTime });
  });
  writeAuctions(auctions);

  // Function to end a lot, with sniper protection
  async function endLotWithSniperProtection(lot, auctionId) {
    // Check if lot already ended
    if (lot.status === 'ended') return;
    // Check for sniper protection: if last bid within 2min of end, extend by 2min (unlimited extensions)
    let endTime = new Date(lot.endTime).getTime();
    let lastBidTime = lot.bidHistory && lot.bidHistory.length > 0 ? new Date(lot.bidHistory[lot.bidHistory.length - 1].time).getTime() : null;
    
    // Initialize extension counter for tracking (no limit enforced)
    lot.extensionCount = lot.extensionCount || 0;
    
    if (lastBidTime && lastBidTime >= endTime - 2 * 60 * 1000) {
      // Extend end time by 2min from the bid time
      endTime = lastBidTime + 2 * 60 * 1000;
      lot.endTime = new Date(endTime).toISOString();
      lot.extensionCount++;
  // Notify all buyers: Auction is live now!
  if (wsNotify) wsNotify(null, { message: `Auction "${auction.title}" is live now!` });
  // Schedule 15 min warning
  setTimeout(() => {
    if (wsNotify) wsNotify(null, { message: `Auction "${auction.title}" ends in 15 mins!` });
  }, Math.max(0, (new Date(auction.endTime).getTime() - 15 * 60 * 1000) - Date.now()));
      writeAuctions(auctions);
      // Wait until new end time
      const waitMs = Math.max(0, endTime - Date.now());
      await new Promise(r => setTimeout(r, waitMs));
    }
    // End the lot
    lot.status = 'ended';
    writeAuctions(auctions);
    // Notify winner/seller if there was a winner
    if (lot.bidHistory && lot.bidHistory.length > 0) {
      const winningBid = lot.bidHistory[lot.bidHistory.length - 1];
      
      // 🧾 AUTO-GENERATE INVOICE FOR WINNER
      try {
        // Create invoice automatically
        const invoiceResponse = await fetch(`${process.env.BASE_URL || 'https://api.all4youauctions.co.za'}/api/invoices/generate/buyer/${auctionId}/${encodeURIComponent(winningBid.bidderEmail)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_SECRET || 'admin-fallback-token'}`
          }
        });
        
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          console.log(`✅ Auto-generated invoice ${invoiceData.invoiceId} for lot ${lot.title}`);
          notifications.push(`Invoice ${invoiceData.invoiceId} auto-generated for winner`);
        } else {
          console.error('Failed to auto-generate invoice:', await invoiceResponse.text());
          notifications.push('Failed to auto-generate invoice');
        }
      } catch (invoiceError) {
        console.error('Invoice generation error:', invoiceError.message);
        notifications.push(`Invoice generation failed: ${invoiceError.message}`);
      }
      
      try {
        await sendMail({
          to: winningBid.bidderEmail,
          subject: 'Congratulations! You won an auction lot - Invoice Generated',
          text: `You have won lot ${lot.title} in auction ${auctionId} for R${winningBid.amount}. Your invoice has been automatically generated and will be emailed to you shortly.`,
          html: `<p>Congratulations! You have <b>won</b> lot <b>${lot.title}</b> in auction <b>${auctionId}</b> for <b>R${winningBid.amount}</b>.<br><br>🧾 Your invoice has been automatically generated and will be emailed to you shortly.<br><br>Please check your email for payment instructions.</p>`
        });
        notifications.push(`Winner notified: ${winningBid.bidderEmail}`);
      } catch (e) { 
        console.log('Email notification failed:', e.message);
        notifications.push(`Failed to notify winner: ${winningBid.bidderEmail} (${e.message})`); 
      }
      if (lot.sellerEmail) {
        try {
          await sendMail({
            to: lot.sellerEmail,
            subject: 'Your lot has been sold!',
            text: `Your lot ${lot.title} in auction ${auctionId} has been sold for R${winningBid.amount}. An invoice will be generated for you.`,
            html: `<p>Your lot <b>${lot.title}</b> in auction <b>${auctionId}</b> has been <b>sold</b> for <b>R${winningBid.amount}</b>.<br>An invoice will be generated for you.</p>`
          });
          notifications.push(`Seller notified: ${lot.sellerEmail}`);
        } catch (e) { 
          console.log('Email notification failed:', e.message);
          notifications.push(`Failed to notify seller: ${lot.sellerEmail} (${e.message})`); 
        }
      }
    }
  }

  // Sequentially end each lot with 10s stagger
  (async () => {
    for (let i = 0; i < lots.length; i++) {
      const lot = lots[i];
      if (lot.status === 'ended') continue;
      const waitMs = Math.max(0, new Date(lot.endTime).getTime() - Date.now());
      await new Promise(r => setTimeout(r, waitMs));
      await endLotWithSniperProtection(lot, auctionId);
    }
    // After all lots ended, auto-generate and email invoices
    try {
      const fetch = require('node-fetch');
      const apiUrl = process.env.API_INTERNAL_URL || `http://localhost:5000/api/invoices/email-invoices/${auctionId}`;
      const response = await fetch(apiUrl, { 
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization, // Pass admin token
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Auto-emailed ${result.successCount} invoices for auction ${auctionId}`);
        notifications.push(`Auto-emailed ${result.successCount} invoices`);
      } else {
        console.error('Failed to auto-email invoices:', await response.text());
        notifications.push('Failed to auto-email invoices');
      }
    } catch (e) {
      console.error('Failed to auto-email invoices:', e.message);
      notifications.push(`Invoice emailing failed: ${e.message}`);
    }
  })();

  res.json({ message: 'Auction lots scheduled to end with stagger and sniper protection. Invoices will be emailed automatically after auction ends.', lotEndTimes });
});
const auctionsPath = path.join(__dirname, '../../data/auctions.json');

// Helper: Load & Save Auctions
function readAuctions() {
  if (!fs.existsSync(auctionsPath)) return [];
  return JSON.parse(fs.readFileSync(auctionsPath, 'utf-8'));
}
function writeAuctions(data) {
  fs.writeFileSync(auctionsPath, JSON.stringify(data, null, 2), 'utf-8');
}

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
router.get('/:auctionId', (req, res) => {
  const { auctionId } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);

  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  let lots = auction.lots || [];
  
  // Add staggered end times if they don't exist
  const now = new Date();
  let hasChanges = false;
  
  lots = lots.map((lot, index) => {
    if (!lot.endTime) {
      // Create staggered end times: first lot ends in 5 minutes, each subsequent lot 1 minute later
      const endTime = new Date(now.getTime() + (5 + index) * 60 * 1000);
      lot.endTime = endTime.toISOString();
      hasChanges = true;
      console.log(`📅 Auto-assigned end time for lot ${index + 1}: ${endTime.toLocaleString()}`);
    }
    
    // Ensure lot has a lotNumber
    if (!lot.lotNumber) {
      lot.lotNumber = index + 1;
      hasChanges = true;
    }
    
    return lot;
  });
  
  // Save changes if any were made
  if (hasChanges) {
    auction.lots = lots;
    writeAuctions(auctions);
  }

  res.json({ lots });
});

// ✅ POST: Add a new lot to an auction
router.post('/:auctionId', verifyAdmin, upload.any(), async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { title, description, startPrice, bidIncrement, endTime, sellerEmail, condition } = req.body;
    
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
    
    const newLotData = {
      auction_id: auctionId,
      title,
      description,
      starting_bid: parseFloat(startPrice),
      current_bid: parseFloat(startPrice),
      bid_increment: parseFloat(bidIncrement) || 10,
      image_urls: imageUrls,
      seller_email: sellerEmail || null,
      condition: condition || 'Good',
      lot_number: maxLotNumber + 1,
      end_time: lotEndTime
    };
    
    const createdLot = await dbModels.createLot(newLotData);
    
    // Format response to match expected format
    const responseData = {
      id: createdLot.id,
      title: createdLot.title,
      description: createdLot.description,
      startPrice: createdLot.starting_bid,
      image: imageUrls.length > 0 ? imageUrls[0] : '',
      currentBid: createdLot.current_bid,
      bidIncrement: createdLot.bid_increment,
      bidHistory: [],
      endTime: createdLot.end_time || lotEndTime,
      createdAt: createdLot.created_at,
      sellerEmail: createdLot.seller_email,
      lotNumber: createdLot.lot_number || (maxLotNumber + 1),
      condition: createdLot.condition
    };
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating lot:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// ✅ PUT: Update a lot
router.put('/:auctionId/:lotId', (req, res) => {
  const { auctionId, lotId } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  const lotIndex = auction.lots.findIndex(l => l.id === lotId);
  if (lotIndex === -1) return res.status(404).json({ error: 'Lot not found' });

  auction.lots[lotIndex] = {
    ...auction.lots[lotIndex],
    ...req.body,
    condition: req.body.condition || auction.lots[lotIndex].condition || 'Good'
  };

  writeAuctions(auctions);
  res.json(auction.lots[lotIndex]);
});

// ✅ DELETE: Remove a lot
router.delete('/:auctionId/:lotId', (req, res) => {
  const { auctionId, lotId } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  auction.lots = auction.lots.filter(l => l.id !== lotId);
  writeAuctions(auctions);

  res.json({ message: 'Lot deleted successfully' });
});


// ✅ NEW: Set or update auto-bid for a user on a lot (protected)
router.put('/:auctionId/:lotId/autobid', authenticateToken, (req, res) => {
  const { auctionId, lotId } = req.params;
  const { bidderEmail, maxBid } = req.body;
  if (!bidderEmail || typeof maxBid !== 'number') {
    return res.status(400).json({ error: 'bidderEmail and maxBid required' });
  }
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  const lot = auction.lots.find(l => l.id === lotId);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });

  // ✅ FICA APPROVAL CHECK - User must be approved to set auto-bids
  const usersPath = path.join(__dirname, '../../data/users.json');
  let users = [];
  if (fs.existsSync(usersPath)) {
    users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  }
  
  const user = users.find(u => u.email === bidderEmail);
  if (!user) {
    return res.status(403).json({ error: 'User not found. Please register to participate in auctions.' });
  }
  
  if (!user.ficaApproved) {
    if (user.rejectionReason) {
      return res.status(403).json({ 
        error: 'Your FICA documents were rejected. Please re-upload your documents for approval before setting auto-bids.',
        rejectionReason: user.rejectionReason
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

  lot.autoBids = lot.autoBids || [];
  // Remove any previous autobid for this user
  lot.autoBids = lot.autoBids.filter(b => b.bidderEmail !== bidderEmail);
  lot.autoBids.push({ bidderEmail, maxBid });
  writeAuctions(auctions);
  res.json({ message: 'Auto-bid set', maxBid });
});

// ✅ NEW: Get auto-bid status for a user on a lot (protected)
router.get('/:auctionId/:lotId/autobid/:userEmail', authenticateToken, (req, res) => {
  const { auctionId, lotId, userEmail } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  const lot = auction.lots.find(l => l.id === lotId);
  if (!lot) return res.status(404).json({ error: 'Lot not found' });
  
  const autoBid = lot.autoBids?.find(b => b.bidderEmail === userEmail);
  res.json({ maxBid: autoBid?.maxBid || null });
});

// Import atomic operations to prevent race conditions
const atomicData = require('../../utils/atomic-data');

// ✅ Place a bid using increment, and process auto-bids (ATOMIC - RACE CONDITION SAFE)
router.post('/:lotId/bid', async (req, res) => {
  const { lotId } = req.params;
  const { bidderEmail, amount, increment } = req.body;

  console.log('🎯 Bid request received:', { lotId, bidderEmail, amount, increment });

  // CRITICAL: Check FICA approval before allowing bidding
  const users = readUsers();
  const user = users.find(u => u.email === bidderEmail);
  
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  if (!user.ficaApproved) {
    return res.status(403).json({ 
      success: false, 
      error: 'FICA approval required before bidding. Please upload required documents.' 
    });
  }

  // First read auctions to find the auction ID (read-only operation)
  const auctions = readAuctions();
  
  // Find auction that contains this lot
  let auction = null;
  let lot = null;
  
  for (const auc of auctions) {
    const foundLot = (auc.lots || []).find(l => l.id === lotId);
    if (foundLot) {
      auction = auc;
      lot = foundLot;
      break;
    }
  }
  
  if (!auction || !lot) {
    return res.status(404).json({ success: false, error: 'Lot not found in any auction' });
  }

  const auctionId = auction.id;

  // FICA check is now handled earlier in the bidding endpoint (lines 433-446)

  if (user.suspended) {
    return res.status(403).json({ 
      success: false, 
      error: 'Your account has been suspended. Please contact support.' 
    });
  }

  // Check if lot has ended
  if (lot.endTime && new Date().getTime() >= new Date(lot.endTime).getTime()) {
    return res.status(400).json({ success: false, error: 'This lot has already ended' });
  }

  // Check if user is trying to bid against themselves
  let previousBidder = lot.bidHistory && lot.bidHistory.length > 0 ? lot.bidHistory[lot.bidHistory.length - 1].bidderEmail : null;
  if (previousBidder === bidderEmail) {
    return res.status(400).json({ success: false, error: 'You are already the highest bidder' });
  }

  // Use the bid increment from the request, or fall back to lot's default increment
  const bidIncrement = increment || lot.bidIncrement || 10;
  
  // Use the amount provided, or calculate based on current bid + increment
  let newBid = amount || (lot.currentBid + bidIncrement);

  try {
    // 🔒 ATOMIC OPERATION - Prevents race conditions in bidding
    const result = await atomicData.placeBidAtomically(auctionId, lotId, {
      bidderEmail: bidderEmail,
      bidAmount: newBid,
      minimumIncrement: bidIncrement,
      originalEndTime: auction.endTime
    });

    const { bidResult } = result;
    if (!bidResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: bidResult.error 
      });
    }

    console.log('✅ Atomic bid placement successful:', bidResult);

    // 🚀 REAL-TIME BID UPDATE - Send to all auction subscribers
    if (sendBidUpdate) {
      sendBidUpdate(auctionId, lotId, {
        currentBid: bidResult.newBid,
        bidderEmail: bidderEmail.substring(0, 3) + '***', // Masked for privacy
        bidAmount: bidResult.newBid,
        lotTitle: lot.title,
        timestamp: new Date().toISOString(),
        bidIncrement: bidIncrement,
        nextMinBid: bidResult.newBid + bidIncrement,
        auctionExtended: bidResult.auctionExtended
      });
    }

    // Notify previous bidder if outbid
    if (bidResult.previousBidder && bidResult.previousBidder !== bidderEmail) {
      // Real-time notification to outbid user
      if (wsNotify) {
        wsNotify(bidResult.previousBidder, { 
          type: 'outbid_notification',
          message: `You've been outbid on lot "${lot.title}"!`,
          lotId: lotId,
          auctionId: auctionId,
          newBid: bidResult.newBid,
          lotTitle: lot.title
        });
      }
    
    try {
      if (sendOutbidNotification) {
        await sendOutbidNotification({
          bidderEmail: previousBidder,
          lotTitle: lot.title,
          auctionTitle: auction ? auction.title : 'Auction',
          auctionId: auctionId,
          lotId: lotId,
          currentBid: lot.currentBid,
          newBidAmount: newBid,
          timeRemaining: auction ? calculateTimeRemaining(auction.endTime) : null
        });
      } else {
        // Fallback to basic email
        await sendMail({
          to: previousBidder,
          subject: 'You have been outbid',
          text: `You have been outbid on lot ${lot.title} in auction ${auctionId}. Place a new bid to stay in the lead!`,
          html: `<p>You have been <b>outbid</b> on lot <b>${lot.title}</b> in auction <b>${auctionId}</b>.<br>Place a new bid to stay in the lead!</p>`
        });
      }
    } catch (e) { 
      console.error('Failed to send outbid email:', e.message); 
    }
  }

  // Process auto-bids
  lot.autoBids = lot.autoBids || [];
  let autobidTriggered = true;
  while (autobidTriggered) {
    autobidTriggered = false;
    // Get last bidder from bid history
    const lastBidder = lot.bidHistory && lot.bidHistory.length > 0 ? 
      lot.bidHistory[lot.bidHistory.length - 1].bidderEmail : null;
    
    // Find all auto-bidders who can outbid current and are not the current highest bidder
    const eligible = lot.autoBids.filter(b => 
      b.maxBid >= lot.currentBid + bidIncrement && 
      b.bidderEmail !== lastBidder
    );
    
    if (eligible.length > 0) {
      // Sort by max bid (highest first), then by when auto-bid was set
      eligible.sort((a, b) => b.maxBid - a.maxBid);
      const winner = eligible[0];
      
      // Calculate new bid - only increment by the minimum needed
      newBid = Math.min(winner.maxBid, lot.currentBid + bidIncrement);
      
      // Only proceed if the auto-bidder's max is high enough
      if (newBid <= winner.maxBid) {
        // Notify previous bidder if outbid
        if (lastBidder && lastBidder !== winner.bidderEmail) {
          if (wsNotify) wsNotify(lastBidder, { 
            type: 'outbid_notification',
            message: `You've been outbid by auto-bid on lot "${lot.title}"!`,
            lotId: lotId,
            auctionId: auctionId,
            newBid: newBid,
            lotTitle: lot.title,
            isAutoBid: true
          });
          
          try {
            if (sendOutbidNotification) {
              await sendOutbidNotification({
                bidderEmail: lastBidder,
                lotTitle: lot.title,
                auctionTitle: auction ? auction.title : 'Auction',
                auctionId: auctionId,
                lotId: lotId,
                currentBid: lot.currentBid,
                newBidAmount: newBid,
                timeRemaining: auction ? calculateTimeRemaining(auction.endTime) : null,
                isAutoBid: true,
                autoBidderMasked: winner.bidderEmail.substring(0, 3) + '***'
              });
            } else {
              // Fallback to basic email
              await sendMail({
                to: lastBidder,
                subject: 'You have been outbid',
                text: `You have been outbid on lot ${lot.title} in auction ${auctionId}. Place a new bid to stay in the lead!`,
                html: `<p>You have been <b>outbid</b> on lot <b>${lot.title}</b> in auction <b>${auctionId}</b>.<br>Place a new bid to stay in the lead!</p>`
              });
            }
          } catch (e) { 
            console.error('Failed to send outbid email:', e.message); 
          }
        }
        
        lot.currentBid = newBid;
        lot.bidHistory.push({
          bidderEmail: winner.bidderEmail,
          amount: newBid,
          time: new Date().toISOString(),
          isAutoBid: true
        });
        
        // 🚀 REAL-TIME AUTO-BID UPDATE
        if (sendBidUpdate) {
          sendBidUpdate(auctionId, lotId, {
            currentBid: lot.currentBid,
            bidderEmail: winner.bidderEmail.substring(0, 3) + '***', // Masked
            bidAmount: newBid,
            lotTitle: lot.title,
            timestamp: new Date().toISOString(),
            bidIncrement: increment,
            nextMinBid: lot.currentBid + bidIncrement,
            isAutoBid: true,
            autoBidder: winner.bidderEmail.substring(0, 3) + '***'
          });
        }
        
        lastBidder = winner.bidderEmail;
        
        // If we reached the auto-bidder's max, remove their auto-bid
        if (newBid >= winner.maxBid) {
          lot.autoBids = lot.autoBids.filter(b => b.bidderEmail !== winner.bidderEmail);
        }
        
        // Continue if there are more eligible auto-bidders
        const stillEligible = lot.autoBids.filter(b => 
          b.maxBid >= lot.currentBid + bidIncrement && 
          b.bidderEmail !== lastBidder
        );
        autobidTriggered = stillEligible.length > 0;
      }
    }
  }

  // 🎯 SNIPER PROTECTION: Extend auction time if bid placed within final 5 minutes
  const currentTime = new Date().getTime();
  const auctionEndTime = new Date(auction.endTime).getTime();
  const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  if (currentTime >= auctionEndTime - fiveMinutesInMs && currentTime < auctionEndTime) {
    // Extend auction by 5 minutes from current time
    const newEndTime = new Date(currentTime + fiveMinutesInMs);
    auction.endTime = newEndTime.toISOString();
    
    // Also extend the specific lot if it has its own end time
    if (lot.endTime) {
      lot.endTime = newEndTime.toISOString();
    }
    
    console.log(`🎯 SNIPER PROTECTION: Auction ${auctionId} extended by 5 minutes due to late bid`);
    
    // Notify all participants about time extension
    if (sendBidUpdate) {
      sendBidUpdate(auctionId, lotId, {
        type: 'auction_extended',
        message: 'Auction time extended by 5 minutes due to late bid!',
        newEndTime: auction.endTime,
        currentBid: lot.currentBid,
        bidderEmail: lastBidder.substring(0, 3) + '***',
        lotTitle: lot.title,
        timestamp: new Date().toISOString()
      });
    }
  }

  writeAuctions(auctions);
    
    // Send bid confirmation email to the successful bidder
    try {
      if (sendBidConfirmation) {
        await sendBidConfirmation({
          bidderEmail: bidderEmail,
          lotTitle: lot.title,
          auctionTitle: auction ? auction.title : 'Auction',
          auctionId: auctionId,
          lotId: lotId,
          bidAmount: bidResult.newBid,
          timeRemaining: auction ? calculateTimeRemaining(auction.endTime) : null,
          nextMinBid: bidResult.newBid + bidIncrement,
          wasExtended: bidResult.auctionExtended
        });
      }
    } catch (e) {
      console.error('Failed to send bid confirmation email:', e.message);
    }
    
    res.json({ 
      success: true,
      message: 'Bid placed successfully', 
      currentBid: bidResult.newBid,
      bidHistory: bidResult.bidHistory,
      newBidAmount: bidResult.newBid,
      auctionExtended: bidResult.auctionExtended
    });

  } catch (error) {
    console.error('❌ Atomic bid placement failed:', error.message);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Bid placement failed. Please try again.' 
    });
  }
});

// PUT /:auctionId/:lotId/assign-seller - Assign seller to a lot (admin only)
router.put('/:auctionId/:lotId/assign-seller', verifyAdmin, (req, res) => {
  const { auctionId, lotId } = req.params;
  const { sellerEmail } = req.body;

  if (!sellerEmail) {
    return res.status(400).json({ error: 'Seller email is required' });
  }

  try {
    // Load lots data
    const lotsPath = path.join(__dirname, '../../data/lots.json');
    const lots = JSON.parse(fs.readFileSync(lotsPath, 'utf8'));
    
    // Find the specific lot
    const lotIndex = lots.findIndex(lot => 
      lot.id === lotId && lot.auctionId === auctionId
    );

    if (lotIndex === -1) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Verify seller exists and is not suspended
    const usersPath = path.join(__dirname, '../../data/users.json');
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const seller = users.find(u => u.email === sellerEmail);

    if (!seller) {
      return res.status(400).json({ error: 'Seller not found' });
    }

    if (seller.suspended) {
      return res.status(400).json({ error: 'Cannot assign suspended seller' });
    }

    // Assign seller to lot
    lots[lotIndex].sellerEmail = sellerEmail;
    lots[lotIndex].assignedAt = new Date().toISOString();
    lots[lotIndex].assignedBy = req.user.email;

    // Save updated lots
    fs.writeFileSync(lotsPath, JSON.stringify(lots, null, 2));

    // Log the assignment
    console.log(`[ADMIN] ${req.user.email} assigned seller ${sellerEmail} to lot ${lotId} in auction ${auctionId}`);

    res.json({
      success: true,
      message: 'Seller assigned successfully',
      lot: lots[lotIndex]
    });

  } catch (error) {
    console.error('Error assigning seller to lot:', error);
    res.status(500).json({ error: 'Failed to assign seller' });
  }
});

module.exports = router;

