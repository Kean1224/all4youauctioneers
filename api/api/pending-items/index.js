// backend/api/pending-items/index.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_PATH = path.join(__dirname, '../../data/pending_items.json');
const UPLOADS_DIR = path.join(__dirname, '../../uploads/sell');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR });

function readData() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Submit new item (seller)
router.post('/', upload.single('image'), (req, res) => {
  const { title, description, category, reserve, condition, sellerEmail } = req.body;
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
});

// List all pending items (admin)
router.get('/', (req, res) => {
  const items = readData();
  res.json(items);
});

// Admin: accept item
router.post('/:id/accept', (req, res) => {
  const items = readData();
  const item = items.find(i => i.id === req.params.id);
  if (item) {
    item.status = 'approved';
    writeData(items);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

// Admin: counter offer
router.post('/:id/counter', (req, res) => {
  const { counterOffer, adminMessage } = req.body;
  const items = readData();
  const item = items.find(i => i.id === req.params.id);
  if (item) {
    item.status = 'countered';
    item.counterOffer = counterOffer;
    item.adminMessage = adminMessage || '';
    writeData(items);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

// Seller: accept/reject counter offer
router.post('/:id/respond', (req, res) => {
  const { response } = req.body; // 'accept' or 'reject'
  const items = readData();
  const item = items.find(i => i.id === req.params.id);
  if (item && item.status === 'countered') {
    if (response === 'accept') {
      item.status = 'approved';
    } else {
      item.status = 'rejected';
    }
    writeData(items);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

// Seller: get their submissions
router.get('/seller/:email', (req, res) => {
  const items = readData();
  res.json(items.filter(i => i.sellerEmail === req.params.email));
});

module.exports = router;
