// backend/api/fica/index.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const FICA_DATA_PATH = path.join(__dirname, '../../data/fica.json');
const FICA_UPLOADS_DIR = path.join(__dirname, '../../uploads/fica');
if (!fs.existsSync(FICA_UPLOADS_DIR)) fs.mkdirSync(FICA_UPLOADS_DIR, { recursive: true });

const upload = multer({ dest: FICA_UPLOADS_DIR });

function readFicaData() {
  if (!fs.existsSync(FICA_DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(FICA_DATA_PATH, 'utf8'));
}
function writeFicaData(data) {
  fs.writeFileSync(FICA_DATA_PATH, JSON.stringify(data, null, 2));
}

// List all FICA uploads (admin)
router.get('/', (req, res) => {
  const data = readFicaData();
  res.json(data);
});

// Get FICA status for a user
router.get('/:email', (req, res) => {
  const data = readFicaData();
  const entry = data.find(f => f.email === req.params.email);
  res.json(entry || { status: 'not_uploaded' });
});

// Upload FICA document
router.post('/:email', upload.single('file'), (req, res) => {
  const data = readFicaData();
  let entry = data.find(f => f.email === req.params.email);
  const fileUrl = `/uploads/fica/${req.file.filename}`;
  if (entry) {
    entry.status = 'pending';
    entry.fileUrl = fileUrl;
  } else {
    entry = { email: req.params.email, status: 'pending', fileUrl };
    data.push(entry);
  }
  writeFicaData(data);
  res.json({ success: true });
});

// Approve FICA (admin)
router.post('/:email/approve', (req, res) => {
  const data = readFicaData();
  const entry = data.find(f => f.email === req.params.email);
  if (entry) {
    entry.status = 'approved';
    writeFicaData(data);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

// Reject FICA (admin)
router.post('/:email/reject', (req, res) => {
  const data = readFicaData();
  const entry = data.find(f => f.email === req.params.email);
  if (entry) {
    entry.status = 'rejected';
    writeFicaData(data);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
