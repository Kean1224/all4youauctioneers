const express = require('express');
const fs = require('fs');
const path = require('path');
const verifyAdmin = require('../auth/verify-admin');
const router = express.Router();

const dataPath = path.join(__dirname, '../../data/refundRequests.json');

function readRefunds() {
  if (!fs.existsSync(dataPath)) return [];
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}
function writeRefunds(refunds) {
  fs.writeFileSync(dataPath, JSON.stringify(refunds, null, 2), 'utf-8');
}

// POST: Buyer requests refund for deposit
router.post('/:auctionId/:email', (req, res) => {
  const { auctionId, email } = req.params;
  const refunds = readRefunds();
  if (refunds.find(r => r.auctionId === auctionId && r.email === email && r.status === 'pending')) {
    return res.status(400).json({ error: 'Refund already requested.' });
  }
  refunds.push({ auctionId, email, status: 'pending', requestedAt: new Date().toISOString() });
  writeRefunds(refunds);
  res.json({ message: 'Refund requested.' });
});

// GET: Admin views all refund requests
router.get('/', verifyAdmin, (req, res) => {
  const refunds = readRefunds();
  res.json(refunds);
});

// PUT: Admin updates refund status
router.put('/:auctionId/:email', verifyAdmin, (req, res) => {
  const { auctionId, email } = req.params;
  const { status } = req.body;
  const refunds = readRefunds();
  const refund = refunds.find(r => r.auctionId === auctionId && r.email === email);
  if (!refund) return res.status(404).json({ error: 'Refund request not found.' });
  refund.status = status || 'approved';
  refund.updatedAt = new Date().toISOString();
  writeRefunds(refunds);
  res.json(refund);
});

module.exports = router;
