// backend/api/pending-items/index.js - MIGRATED TO POSTGRESQL
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dbModels = require('../../database/models');
const cloudinaryService = require('../../services/cloudinaryService');
const router = express.Router();

const DATA_PATH = path.join(__dirname, '../../data/pending_items.json');
const UPLOADS_DIR = path.join(__dirname, '../../uploads/sell');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configure multer for memory storage (images will be stored in PostgreSQL)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Legacy JSON file operations (fallback)
function readData() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Submit new item (seller) - MIGRATED TO POSTGRESQL
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, reserve, condition, sellerEmail } = req.body;
    
    const itemData = {
      title,
      description,
      category,
      reserve_price: parseFloat(reserve) || 0,
      condition,
      seller_email: sellerEmail,
      image_data: req.file ? await (async () => {
        console.log('📄 Uploading pending item image to Cloudinary...');
        const uploadResult = await cloudinaryService.uploadLotImage(req.file.buffer, {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          userEmail: sellerEmail
        });
        console.log('✅ Pending item image uploaded:', uploadResult.url);
        return uploadResult.url;
      })() : null,
      original_filename: req.file ? req.file.originalname : null,
      status: 'pending'
    };
    
    // Try PostgreSQL first
    const pendingItem = await dbModels.createPendingItem(itemData);
    
    if (pendingItem) {
      // Transform to match expected format
      const responseItem = {
        id: pendingItem.id.toString(),
        title: pendingItem.title,
        description: pendingItem.description,
        category: pendingItem.category,
        reserve: pendingItem.reserve_price,
        condition: pendingItem.condition,
        sellerEmail: pendingItem.seller_email,
        imageUrl: pendingItem.image_data ? 'stored_in_database' : '',
        status: pendingItem.status,
        counterOffer: pendingItem.counter_offer,
        adminMessage: pendingItem.admin_message || '',
        createdAt: pendingItem.created_at
      };
      return res.json({ success: true, item: responseItem });
    }
    
    // Fallback to JSON file
    const items = readData();
    const id = Date.now().toString();
    const newItem = {
      id,
      title,
      description,
      category,
      reserve,
      condition,
      sellerEmail,
      imageUrl: req.file ? `/uploads/sell/${req.file.filename}` : '',
      status: 'pending',
      counterOffer: null,
      adminMessage: '',
      createdAt: new Date().toISOString()
    };
    items.push(newItem);
    writeData(items);
    res.json({ success: true, item: newItem });
    
  } catch (error) {
    console.error('Error creating pending item:', error);
    res.status(500).json({ error: 'Failed to submit item' });
  }
});

// List all pending items (admin) - MIGRATED TO POSTGRESQL
router.get('/', async (req, res) => {
  try {
    // Try PostgreSQL first
    const items = await dbModels.getAllPendingItems();
    
    if (items.length > 0) {
      // Transform database fields to match expected format
      const transformedItems = items.map(item => ({
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        category: item.category,
        reserve: item.reserve_price,
        condition: item.condition,
        sellerEmail: item.seller_email,
        imageUrl: item.image_data ? 'stored_in_database' : '',
        status: item.status,
        counterOffer: item.counter_offer,
        adminMessage: item.admin_message || '',
        createdAt: item.created_at
      }));
      return res.json(transformedItems);
    }
    
    // Fallback to JSON file
    const jsonItems = readData();
    res.json(jsonItems);
  } catch (error) {
    console.error('Error fetching pending items:', error);
    // Fallback to JSON file on error
    const jsonItems = readData();
    res.json(jsonItems);
  }
});

// Admin: accept item - MIGRATED TO POSTGRESQL
router.post('/:id/accept', async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Try PostgreSQL first
    const updateData = {
      status: 'approved',
      processed_by: req.user?.email || 'admin'
    };
    
    const updatedItem = await dbModels.updatePendingItem(itemId, updateData);
    
    if (updatedItem) {
      return res.json({ success: true });
    }
    
    // Fallback to JSON file
    const items = readData();
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.status = 'approved';
      writeData(items);
      return res.json({ success: true });
    }
    
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error accepting item:', error);
    res.status(500).json({ error: 'Failed to accept item' });
  }
});

// Admin: counter offer - MIGRATED TO POSTGRESQL
router.post('/:id/counter', async (req, res) => {
  try {
    const { counterOffer, adminMessage } = req.body;
    const itemId = req.params.id;
    
    // Try PostgreSQL first
    const updateData = {
      status: 'countered',
      counter_offer: parseFloat(counterOffer),
      admin_message: adminMessage || '',
      processed_by: req.user?.email || 'admin'
    };
    
    const updatedItem = await dbModels.updatePendingItem(itemId, updateData);
    
    if (updatedItem) {
      return res.json({ success: true });
    }
    
    // Fallback to JSON file
    const items = readData();
    const item = items.find(i => i.id === itemId);
    if (item) {
      item.status = 'countered';
      item.counterOffer = counterOffer;
      item.adminMessage = adminMessage || '';
      writeData(items);
      return res.json({ success: true });
    }
    
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error creating counter offer:', error);
    res.status(500).json({ error: 'Failed to create counter offer' });
  }
});

// Seller: accept/reject counter offer - MIGRATED TO POSTGRESQL
router.post('/:id/respond', async (req, res) => {
  try {
    const { response } = req.body; // 'accept' or 'reject'
    const itemId = req.params.id;
    
    // Try PostgreSQL first
    const item = await dbModels.getPendingItemById(itemId);
    
    if (item && item.status === 'countered') {
      const updateData = {
        status: response === 'accept' ? 'approved' : 'rejected',
        processed_by: req.user?.email || 'seller'
      };
      
      const updatedItem = await dbModels.updatePendingItem(itemId, updateData);
      if (updatedItem) {
        return res.json({ success: true });
      }
    }
    
    // Fallback to JSON file
    const items = readData();
    const jsonItem = items.find(i => i.id === itemId);
    if (jsonItem && jsonItem.status === 'countered') {
      if (response === 'accept') {
        jsonItem.status = 'approved';
      } else {
        jsonItem.status = 'rejected';
      }
      writeData(items);
      return res.json({ success: true });
    }
    
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error responding to counter offer:', error);
    res.status(500).json({ error: 'Failed to respond to counter offer' });
  }
});

// Seller: get their submissions - MIGRATED TO POSTGRESQL
router.get('/seller/:email', async (req, res) => {
  try {
    const sellerEmail = req.params.email;
    
    // Try PostgreSQL first
    const items = await dbModels.getPendingItemsBySeller(sellerEmail);
    
    if (items.length > 0) {
      // Transform database fields to match expected format
      const transformedItems = items.map(item => ({
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        category: item.category,
        reserve: item.reserve_price,
        condition: item.condition,
        sellerEmail: item.seller_email,
        imageUrl: item.image_data ? 'stored_in_database' : '',
        status: item.status,
        counterOffer: item.counter_offer,
        adminMessage: item.admin_message || '',
        createdAt: item.created_at
      }));
      return res.json(transformedItems);
    }
    
    // Fallback to JSON file
    const jsonItems = readData();
    res.json(jsonItems.filter(i => i.sellerEmail === sellerEmail));
  } catch (error) {
    console.error('Error fetching seller items:', error);
    // Fallback to JSON file on error
    const jsonItems = readData();
    res.json(jsonItems.filter(i => i.sellerEmail === req.params.email));
  }
});

module.exports = router;
