const verifyAdmin = require('../auth/verify-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Configure multer for auction image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/auctions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `auction-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

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

// Helper: read lots from all auctions
function readLotsForAuction(auction) {
  return (auction.lots || []).map(lot => ({ ...lot }));
}

const dataPath = path.join(__dirname, '../../data/auctions.json');

// Helper: read auctions
function readAuctions() {
  if (!fs.existsSync(dataPath)) return [];
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

// Helper: write auctions
function writeAuctions(auctions) {
  fs.writeFileSync(dataPath, JSON.stringify(auctions, null, 2), 'utf-8');
}

// Helper: Check if auction is completed (all lots have ended)
function isAuctionCompleted(auction) {
  if (!auction.lots || auction.lots.length === 0) {
    return false; // No lots means auction is not completed
  }
  return auction.lots.every(lot => lot.status === 'ended');
}

// GET all active auctions (excludes completed ones)
router.get('/', (req, res) => {
  const auctions = readAuctions();
  const activeAuctions = auctions.filter(auction => !isAuctionCompleted(auction));
  res.json(activeAuctions);
});

// GET all past/completed auctions
router.get('/past', (req, res) => {
  const auctions = readAuctions();
  const completedAuctions = auctions.filter(auction => isAuctionCompleted(auction));
  res.json(completedAuctions);
});

// GET single auction by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === id);

  if (!auction) {
    return res.status(404).json({ error: 'Auction not found' });
  }

  // Increment view count
  auction.viewCount = (auction.viewCount || 0) + 1;
  writeAuctions(auctions);

  res.json(auction);
});

// POST new auction (admin only)
router.post('/', verifyAdmin, upload.single('auctionImage'), (req, res) => {
  const { title, description, location, startTime, endTime, increment, depositRequired, depositAmount } = req.body;

  if (!title || !startTime || !endTime || !increment) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const auctions = readAuctions();

  const newAuction = {
    id: uuidv4(),
    title,
    description: description || '',
    location: location || '',
    startTime,
    endTime,
    increment: parseInt(increment),
    depositRequired: !!depositRequired,
    depositAmount: depositRequired ? Number(depositAmount) : 0,
    auctionImage: req.file ? `/uploads/auctions/${req.file.filename}` : null,
    lots: [],
    createdAt: new Date().toISOString(),
  };

  auctions.push(newAuction);
  writeAuctions(auctions);

  res.status(201).json(newAuction);
});

// PUT update an auction (admin only)
router.put('/:id', verifyAdmin, upload.single('auctionImage'), (req, res) => {
  const { id } = req.params;
  const auctions = readAuctions();
  const index = auctions.findIndex(a => a.id === id);

  if (index === -1) return res.status(404).json({ error: 'Auction not found' });

  // Only allow updating deposit fields if provided
  const update = { ...req.body };
  if (typeof update.depositRequired !== 'undefined') {
    update.depositRequired = !!update.depositRequired;
    update.depositAmount = update.depositRequired ? Number(update.depositAmount) : 0;
  }

  // Handle image update
  if (req.file) {
    // Delete old image if exists
    if (auctions[index].auctionImage) {
      const oldImagePath = path.join(__dirname, '../../', auctions[index].auctionImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    update.auctionImage = `/uploads/auctions/${req.file.filename}`;
  }

  auctions[index] = { ...auctions[index], ...update };
  writeAuctions(auctions);

  res.json(auctions[index]);
});

// DELETE auction (admin only)
router.delete('/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  let auctions = readAuctions();
  const auction = auctions.find(a => a.id === id);

  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  auctions = auctions.filter(a => a.id !== id);
  writeAuctions(auctions);

  res.json({ message: 'Auction deleted successfully' });
});

// GET /:id/lots - Get all lots for a specific auction
router.get('/:id/lots', (req, res) => {
  const { id } = req.params;
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === id);
  
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  
  const lots = readLotsForAuction(auction);
  res.json({ lots });
});

// GET /:id/is-registered?email=... - Check if user is registered for auction
router.get('/:id/is-registered', (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  const registered = Array.isArray(auction.registeredUsers) && auction.registeredUsers.includes(email);
  res.json({ registered });
});

// POST /:id/register - Register a user for an auction
router.post('/:id/register', (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (!auction.registeredUsers) auction.registeredUsers = [];
  if (!auction.registeredUsers.includes(email)) {
    auction.registeredUsers.push(email);
    writeAuctions(auctions);
  }
  res.json({ success: true });
});

// POST /:id/rerun - Duplicate auction and its lots with new start/end dates (admin only)
router.post('/:id/rerun', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { startTime, endTime } = req.body;
  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'New startTime and endTime required.' });
  }
  const auctions = readAuctions();
  const auction = auctions.find(a => a.id === id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  // Duplicate auction (new id, new dates, reset lots)
  const newAuction = {
    ...auction,
    id: uuidv4(),
    startTime,
    endTime,
    createdAt: new Date().toISOString(),
    lots: [],
  };
  // Duplicate lots (new ids, reset bids/history)
  const origLots = readLotsForAuction(auction);
  newAuction.lots = origLots.map(lot => ({
    ...lot,
    id: uuidv4(),
    bidHistory: [],
    currentBid: lot.startPrice,
    autoBids: [],
    status: undefined,
    endTime: undefined,
    // keep lotNumber, title, description, startPrice, image, sellerEmail, condition
  }));
  auctions.push(newAuction);
  writeAuctions(auctions);
  res.status(201).json(newAuction);
});

module.exports = router;
