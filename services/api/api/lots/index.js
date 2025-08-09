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
  const wsServer = require('../../ws-server');
  wsNotify = wsServer.sendNotification;
  sendBidUpdate = wsServer.sendBidUpdate;
  sendTimerUpdate = wsServer.sendTimerUpdate;
  sendAuctionUpdate = wsServer.sendAuctionUpdate;
  console.log('✅ Real-time WebSocket bidding system loaded');
} catch (e) {
  console.log('⚠️  WebSocket server not available for lot notifications');
}

const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../../middleware/auth');

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
    // Check for sniper protection: if last bid within 4min of end, extend by 4min
    let endTime = new Date(lot.endTime).getTime();
    let lastBidTime = lot.bidHistory && lot.bidHistory.length > 0 ? new Date(lot.bidHistory[lot.bidHistory.length - 1].time).getTime() : null;
    if (lastBidTime && lastBidTime >= endTime - 4 * 60 * 1000) {
      // Extend end time by 4min
      endTime = lastBidTime + 4 * 60 * 1000;
      lot.endTime = new Date(endTime).toISOString();
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
        const invoiceResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/invoices/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auctionId: auctionId,
            lotId: lot.id,
            winnerEmail: winningBid.bidderEmail,
            finalAmount: winningBid.amount,
            lotTitle: lot.title,
            auctionTitle: auction.title || 'Auction',
            autoGenerated: true
          })
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
      const apiUrl = process.env.API_INTERNAL_URL || `http://localhost:3001/api/invoices/email-invoices/${auctionId}`;
      await fetch(apiUrl, { method: 'POST' });
    } catch (e) {
      console.error('Failed to auto-email invoices:', e);
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

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/lots/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

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
router.post('/:auctionId', upload.single('image'), (req, res) => {
  const { auctionId } = req.params;
  const { title, description, startPrice, bidIncrement, endTime, sellerEmail, condition } = req.body;
  const image = req.file ? `/uploads/lots/${req.file.filename}` : '';

  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  auction.lots = auction.lots || [];
  // Find the highest lotNumber in this auction
  let maxLotNumber = 0;
  auction.lots.forEach(lot => {
    if (typeof lot.lotNumber === 'number' && lot.lotNumber > maxLotNumber) {
      maxLotNumber = lot.lotNumber;
    }
  });
  
  // Create staggered end time if not provided
  let lotEndTime = endTime;
  if (!lotEndTime) {
    const now = new Date();
    // Each lot ends 1 minute after the previous lot
    // First lot (lotNumber 1) ends in 5 minutes from now
    // Second lot (lotNumber 2) ends in 6 minutes from now, etc.
    const minutesToAdd = 5 + maxLotNumber; // maxLotNumber is current count, so new lot will be maxLotNumber + 1
    lotEndTime = new Date(now.getTime() + minutesToAdd * 60 * 1000).toISOString();
    console.log(`📅 Auto-scheduled lot ${maxLotNumber + 1} to end at: ${new Date(lotEndTime).toLocaleString()}`);
  }
  
  const newLot = {
    id: uuidv4(),
    title,
    description,
    startPrice: parseFloat(startPrice),
    image,
    currentBid: parseFloat(startPrice),
    bidIncrement: parseFloat(bidIncrement) || 10,
    bidHistory: [],
    endTime: lotEndTime,
    createdAt: new Date().toISOString(),
    sellerEmail: sellerEmail || null,
    lotNumber: maxLotNumber + 1,
    condition: condition || 'Good'
  };
  auction.lots.push(newLot);
  writeAuctions(auctions);
  res.status(201).json(newLot);
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

// ✅ Place a bid using increment, and process auto-bids
router.post('/:lotId/bid', async (req, res) => {
  const { lotId } = req.params;
  const { bidderEmail, amount, increment } = req.body;

  console.log('🎯 Bid request received:', { lotId, bidderEmail, amount, increment });

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

  // ✅ FICA APPROVAL CHECK - User must be approved to bid
  const usersPath = path.join(__dirname, '../../data/users.json');
  let users = [];
  if (fs.existsSync(usersPath)) {
    users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  }
  
  const user = users.find(u => u.email === bidderEmail);
  if (!user) {
    return res.status(403).json({ 
      success: false, 
      error: 'User not found. Please register to participate in auctions.' 
    });
  }
  
  if (!user.ficaApproved) {
    if (user.rejectionReason) {
      return res.status(403).json({ 
        success: false, 
        error: 'Your FICA documents were rejected. Please re-upload your documents for approval before bidding.',
        rejectionReason: user.rejectionReason
      });
    } else {
      return res.status(403).json({ 
        success: false, 
        error: 'Your FICA documents are pending approval. You will be able to bid once approved by our admin team.' 
      });
    }
  }

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
  
  // Validate that the proposed bid meets the minimum increment requirement
  const expectedMinBid = lot.currentBid + bidIncrement;
  if (amount && amount < expectedMinBid) {
    return res.status(400).json({ 
      success: false, 
      error: `Minimum bid is R${expectedMinBid.toLocaleString()}` 
    });
  }

  // Use the amount provided, or calculate based on current bid + increment
  let newBid = amount || (lot.currentBid + bidIncrement);
  let lastBidder = bidderEmail || 'unknown';

  lot.currentBid = newBid;
  lot.bidHistory = lot.bidHistory || [];
  lot.bidHistory.push({
    bidderEmail: lastBidder,
    amount: newBid,
    time: new Date().toISOString()
  });

  // 🚀 REAL-TIME BID UPDATE - Send to all auction subscribers
  if (sendBidUpdate) {
    sendBidUpdate(auctionId, lotId, {
      currentBid: lot.currentBid,
      bidderEmail: lastBidder.substring(0, 3) + '***', // Masked for privacy
      bidAmount: newBid,
      lotTitle: lot.title,
      timestamp: new Date().toISOString(),
      bidIncrement: bidIncrement,
      nextMinBid: lot.currentBid + bidIncrement
    });
  }

  // Notify previous bidder if outbid
  if (previousBidder && previousBidder !== lastBidder) {
    // Real-time notification to outbid user
    if (wsNotify) {
      wsNotify(previousBidder, { 
        type: 'outbid_notification',
        message: `You've been outbid on lot "${lot.title}"!`,
        lotId: lotId,
        auctionId: auctionId,
        newBid: newBid,
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
        bidderEmail: lastBidder,
        lotTitle: lot.title,
        auctionTitle: auction ? auction.title : 'Auction',
        auctionId: auctionId,
        lotId: lotId,
        bidAmount: lot.currentBid,
        timeRemaining: auction ? calculateTimeRemaining(auction.endTime) : null,
        nextMinBid: lot.currentBid + bidIncrement,
        wasExtended: currentTime >= auctionEndTime - fiveMinutesInMs && currentTime < auctionEndTime
      });
    }
  } catch (e) {
    console.error('Failed to send bid confirmation email:', e.message);
  }
  
  res.json({ 
    success: true,
    message: 'Bid placed successfully', 
    currentBid: lot.currentBid,
    bidHistory: lot.bidHistory,
    newBidAmount: newBid 
  });
});

module.exports = router;

