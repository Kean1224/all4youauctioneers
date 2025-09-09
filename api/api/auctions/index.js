const verifyAdmin = require('../auth/verify-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dbModels = require('../../database/models');
const redisCache = require('../../utils/redis-cache');

// Configure multer for memory storage (images will be stored in PostgreSQL)
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

// Helper: read lots from all auctions
function readLotsForAuction(auction) {
  return (auction.lots || []).map(lot => ({ ...lot }));
}

// Removed JSON file dependencies - using PostgreSQL only

// Helper: Check if auction is completed (all lots have ended)
function isAuctionCompleted(auction) {
  if (!auction.lots || auction.lots.length === 0) {
    return false; // No lots means auction is not completed
  }
  return auction.lots.every(lot => lot.status === 'ended');
}

// GET all active auctions (excludes completed ones) - WITH REDIS CACHING
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'auctions:active';
    
    // Try to get from Redis cache first
    const cachedAuctions = await redisCache.get(cacheKey);
    if (cachedAuctions) {
      console.log(`🔥 Cache HIT: Returning ${cachedAuctions.length} cached auctions`);
      return res.json(cachedAuctions);
    }
    
    console.log('🔍 Cache MISS: Fetching auctions from database');
    
    // PERFORMANCE FIX: Use optimized query to get auctions with lot counts (eliminates N+1 query problem)
    const auctions = await dbModels.getAuctionsWithLotCounts();
    const activeAuctions = auctions.filter(auction => !isAuctionCompleted(auction));
    
    // Transform auctions with pre-calculated counts - much faster than individual queries
    const transformedAuctions = activeAuctions.map(auction => {
      return {
        ...auction,
        // Add frontend-expected field names
        startDate: auction.start_time,
        endDate: auction.end_time,
        auctionImage: auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : null,
        image: auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : null,
        // Use pre-calculated counts from optimized query
        totalLots: parseInt(auction.total_lots) || 0,
        lots: [], // Don't include full lot data in list view for performance
        viewCount: parseInt(auction.total_views) || 0
      };
    });
    
    // Cache for 60 seconds - frequent updates needed for live bidding
    await redisCache.set(cacheKey, transformedAuctions, 60);
    
    console.log(`📋 Cached and returning ${transformedAuctions.length} auctions with lot counts`);
    res.json(transformedAuctions);
  } catch (error) {
    console.error('Error fetching auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// GET all past/completed auctions
router.get('/past', async (req, res) => {
  try {
    const auctions = await dbModels.getAllAuctions();
    const completedAuctions = auctions.filter(auction => isAuctionCompleted(auction));
    
    // Transform auctions to match frontend expectations
    const transformedAuctions = completedAuctions.map(auction => ({
      ...auction,
      // Add frontend-expected field names
      startDate: auction.start_time,
      endDate: auction.end_time,
      auctionImage: auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : null,
      image: auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : null
    }));
    
    res.json(transformedAuctions);
  } catch (error) {
    console.error('Error fetching past auctions:', error);
    res.status(500).json({ error: 'Failed to fetch past auctions' });
  }
});

// GET single auction by ID - WITH REDIS CACHING
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `auction:${id}:details`;
    
    // Try to get from Redis cache first
    const cachedAuction = await redisCache.get(cacheKey);
    if (cachedAuction) {
      console.log(`🔥 Cache HIT: Returning cached auction ${id} with ${cachedAuction.lots?.length || 0} lots`);
      return res.json(cachedAuction);
    }
    
    console.log('🔍 Cache MISS: Fetching auction with ID:', id);
    
    const auction = await dbModels.getAuctionById(id);

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    console.log('✅ Found auction:', auction.title);

    // Get auction with lots data
    const auctionWithLots = await dbModels.getAuctionWithLots(id);
    console.log('📦 getAuctionWithLots result:', auctionWithLots ? 'Found auction' : 'NULL');
    console.log('📦 Lots data:', auctionWithLots?.lots ? `${auctionWithLots.lots.length} lots` : 'No lots');
    
    const rawLots = auctionWithLots?.lots || [];
    
    // Transform lots to match frontend expectations - same as in lots endpoint
    const transformedLots = rawLots.map(lot => ({
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
      bidHistory: [], // Will be populated by separate call if needed
      endTime: lot.end_time,
      lotNumber: lot.lot_number || 0,
      sellerEmail: lot.seller_email || null,
      condition: lot.condition || 'Good',
      createdAt: lot.created_at,
      status: lot.status || 'active',
      bid_count: parseInt(lot.bid_count) || 0,
      views: parseInt(lot.views) || 0,
      watchers: parseInt(lot.watchers) || 0
    }));
    
    console.log('🔄 Transformed', transformedLots.length, 'lots for frontend compatibility');
    
    // Transform auction to match frontend expectations
    const transformedAuction = {
      ...auction,
      // Add frontend-expected field names for cards
      startDate: auction.start_time,
      endDate: auction.end_time,
      // Add frontend-expected field names for detail page
      startTime: auction.start_time,
      endTime: auction.end_time,
      auctionImage: auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : null,
      image: auction.image_urls && auction.image_urls.length > 0 ? auction.image_urls[0] : null,
      lots: transformedLots,
      createdAt: auction.created_at
    };

    // Cache for 30 seconds - balance between performance and data freshness
    await redisCache.set(cacheKey, transformedAuction, 30);

    console.log('🚀 Cached and sending response with', transformedLots.length, 'lots');
    
    // TODO: Implement view count increment in database if needed
    res.json(transformedAuction);
  } catch (error) {
    console.error('❌ Error fetching auction:', error);
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

// POST new auction (admin only)
router.post('/', verifyAdmin, upload.any(), async (req, res) => {
  try {
    console.log('🎯 Auction creation request received:', {
      body: req.body,
      files: req.files,
      fileCount: req.files ? req.files.length : 0,
      user: req.user?.email
    });
    
    const { title, description, location, startTime, endTime, increment, depositRequired, depositAmount } = req.body;

    if (!title || !startTime || !endTime || !increment) {
      console.log('❌ Missing required fields:', { title, startTime, endTime, increment });
      return res.status(400).json({ error: 'Missing required fields.' });
    }

  // Parse numeric values safely
  const parsedIncrement = parseInt(increment) || 10;
  const parsedDepositAmount = depositRequired ? Number(depositAmount) || 0 : 0;
  
  console.log('🔢 Parsed values:', { parsedIncrement, depositRequired, parsedDepositAmount });

  // Handle image upload to PostgreSQL
  let imageUrl = null;
  if (req.files && req.files.length > 0) {
    // Try both 'image' and 'auctionImage' field names for compatibility
    const imageFile = req.files.find(f => f.fieldname === 'image' || f.fieldname === 'auctionImage');
    if (imageFile) {
      // Store image as base64 in PostgreSQL
      imageUrl = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
      console.log('🖼️ Image stored in PostgreSQL, fieldname:', imageFile.fieldname);
    } else {
      console.log('🚨 No image file found. Available fields:', req.files.map(f => f.fieldname));
    }
  }

  // Get user ID from email
  const userEmail = req.user?.email || 'admin@all4youauctions.co.za';
  const user = await dbModels.getUserByEmail(userEmail);
  const userId = user ? user.id : null;

  const newAuctionData = {
    title,
    description: description || '',
    location: location || '',
    start_time: startTime,
    end_time: endTime,
    increment: parsedIncrement,
    deposit_required: !!depositRequired,
    deposit_amount: parsedDepositAmount,
    image_urls: imageUrl ? [imageUrl] : [],
    created_by: userId,
    status: 'draft'
  };
  
  console.log('📋 Creating auction in database...');

  // Create auction in PostgreSQL
  const createdAuction = await dbModels.createAuction(newAuctionData);
  console.log('💾 Auction created in database successfully');

  // Clear cache when auction is created
  await redisCache.clearPattern('auctions:');
  console.log('🔄 Cache cleared after auction creation');

  console.log('✅ Auction created successfully:', createdAuction.id, createdAuction.title);
  res.status(201).json({
    id: createdAuction.id,
    title: createdAuction.title,
    description: createdAuction.description,
    location: location || '',
    startTime: createdAuction.start_time,
    endTime: createdAuction.end_time,
    increment: createdAuction.increment,
    depositRequired: !!createdAuction.deposit_required,
    depositAmount: createdAuction.deposit_amount,
    auctionImage: imageUrl,
    lots: [],
    createdAt: createdAuction.created_at,
    status: createdAuction.status
  });
  
  } catch (error) {
    console.error('🚨 Auction creation error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// PUT update an auction (admin only) - MIGRATED TO POSTGRESQL
router.put('/:id', verifyAdmin, upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await dbModels.getAuctionById(id);

    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Only allow updating deposit fields if provided
    const update = { ...req.body };
    if (typeof update.depositRequired !== 'undefined') {
      update.depositRequired = !!update.depositRequired;
      update.depositAmount = update.depositRequired ? Number(update.depositAmount) : 0;
    }

    // Handle image update - store as base64 in database
    const auctionImageFile = req.files && req.files.find(f => f.fieldname === 'auctionImage');
    if (auctionImageFile) {
      // Store new image as base64
      const imageData = `data:${auctionImageFile.mimetype};base64,${auctionImageFile.buffer.toString('base64')}`;
      update.image_urls = [imageData];
    }

    // Update auction in database
    const updatedAuction = await dbModels.updateAuction(id, update);
    
    // Clear relevant cache entries when auction is updated
    await redisCache.del(`auction:${id}:details`);
    await redisCache.clearPattern('auctions:');
    console.log('🔄 Cache cleared after auction update');
    
    res.json(updatedAuction);
  } catch (error) {
    console.error('Error updating auction:', error);
    res.status(500).json({ error: 'Failed to update auction' });
  }
});

// DELETE auction (admin only) - MIGRATED TO POSTGRESQL
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete auction from database (CASCADE deletes lots, bids, etc.)
    const deletedAuction = await dbModels.deleteAuction(id);
    
    // Clear relevant cache entries when auction is deleted
    await redisCache.del(`auction:${id}:details`);
    await redisCache.clearPattern('auctions:');
    console.log('🔄 Cache cleared after auction deletion');
    
    res.json({ 
      message: 'Auction deleted successfully', 
      auction: deletedAuction 
    });
    
  } catch (error) {
    if (error.message === 'Auction not found') {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    console.error('Error deleting auction:', error);
    res.status(500).json({ error: 'Failed to delete auction' });
  }
});

// GET /:id/lots - Get all lots for a specific auction - MIGRATED TO POSTGRESQL
router.get('/:id/lots', async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await dbModels.getAuctionById(id);
    
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    
    const lots = await dbModels.getLotsByAuctionId(id);
    res.json({ lots });
  } catch (error) {
    console.error('Error fetching auction lots:', error);
    res.status(500).json({ error: 'Failed to fetch auction lots' });
  }
});

// GET /:id/is-registered?email=... - Check if user is registered for auction - MIGRATED TO POSTGRESQL
router.get('/:id/is-registered', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const auction = await dbModels.getAuctionById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    
    const registered = await dbModels.isUserRegisteredForAuction(id, email);
    res.json({ registered });
  } catch (error) {
    console.error('Error checking auction registration:', error);
    res.status(500).json({ error: 'Failed to check registration status' });
  }
});

// POST /:id/register - Register a user for an auction - MIGRATED TO POSTGRESQL
router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const auction = await dbModels.getAuctionById(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    
    const isAlreadyRegistered = await dbModels.isUserRegisteredForAuction(id, email);
    if (!isAlreadyRegistered) {
      await dbModels.registerUserForAuction(id, email);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering user for auction:', error);
    res.status(500).json({ error: 'Failed to register for auction' });
  }
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
