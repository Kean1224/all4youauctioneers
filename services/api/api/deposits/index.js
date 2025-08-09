const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');

const router = express.Router();

// Deposit storage paths
const DEPOSITS_FILE = path.join(__dirname, '../../data/auctionDeposits.json');
const DEPOSITS_UPLOAD_DIR = path.join(__dirname, '../../uploads/deposits');

// Ensure upload directory exists
if (!fs.existsSync(DEPOSITS_UPLOAD_DIR)) {
  fs.mkdirSync(DEPOSITS_UPLOAD_DIR, { recursive: true });
}

// Configure multer for deposit proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DEPOSITS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const userEmail = req.user?.email || 'unknown';
    const auctionId = req.body.auctionId || req.params.auctionId;
    const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `deposit_${sanitizedEmail}_${auctionId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// Helper functions
const readDeposits = () => {
  try {
    if (fs.existsSync(DEPOSITS_FILE)) {
      const data = fs.readFileSync(DEPOSITS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading deposits file:', error);
    return [];
  }
};

const writeDeposits = (deposits) => {
  try {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(deposits, null, 2));
  } catch (error) {
    console.error('Error writing deposits file:', error);
  }
};

const readAuctions = () => {
  try {
    const auctionsPath = path.join(__dirname, '../../data/auctions.json');
    if (fs.existsSync(auctionsPath)) {
      const data = fs.readFileSync(auctionsPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading auctions file:', error);
    return [];
  }
};

// Email notification imports
let sendMail = null;
try {
  const mailerModule = require('../../utils/mailer');
  sendMail = mailerModule.sendMail;
} catch (e) {
  console.log('⚠️  Email service not available for deposits');
  sendMail = async () => Promise.resolve();
}

// 📤 Submit deposit proof (User endpoint)
router.post('/submit', authenticateToken, upload.single('depositProof'), async (req, res) => {
  try {
    const { auctionId, amount, paymentMethod, referenceNumber, notes } = req.body;
    const userEmail = req.user.email;

    if (!auctionId || !amount || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: auctionId, amount, paymentMethod' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'Deposit proof file is required' 
      });
    }

    // Get auction details
    const auctions = readAuctions();
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if deposit already submitted for this auction
    const deposits = readDeposits();
    const existingDeposit = deposits.find(d => 
      d.userEmail === userEmail && 
      d.auctionId === auctionId && 
      d.status !== 'rejected'
    );

    if (existingDeposit) {
      return res.status(400).json({ 
        error: 'Deposit already submitted for this auction', 
        status: existingDeposit.status 
      });
    }

    // Create new deposit record
    const deposit = {
      id: uuidv4(),
      userEmail,
      auctionId,
      auctionTitle: auction.title,
      amount: parseFloat(amount),
      requiredAmount: auction.depositAmount || 0,
      paymentMethod,
      referenceNumber: referenceNumber || '',
      notes: notes || '',
      proofFilename: req.file.filename,
      proofOriginalName: req.file.originalname,
      proofPath: req.file.path,
      submittedAt: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: ''
    };

    deposits.push(deposit);
    writeDeposits(deposits);

    res.json({ 
      message: 'Deposit proof submitted successfully', 
      depositId: deposit.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error submitting deposit:', error);
    res.status(500).json({ error: 'Failed to submit deposit proof' });
  }
});

// 📋 Get user's deposit status for an auction
router.get('/status/:auctionId', authenticateToken, (req, res) => {
  try {
    const { auctionId } = req.params;
    const userEmail = req.user.email;

    const deposits = readDeposits();
    const deposit = deposits.find(d => 
      d.userEmail === userEmail && 
      d.auctionId === auctionId
    );

    if (!deposit) {
      return res.json({ status: 'not_submitted', deposit: null });
    }

    // Remove sensitive file paths from response
    const safeDeposit = {
      id: deposit.id,
      auctionId: deposit.auctionId,
      auctionTitle: deposit.auctionTitle,
      amount: deposit.amount,
      requiredAmount: deposit.requiredAmount,
      paymentMethod: deposit.paymentMethod,
      referenceNumber: deposit.referenceNumber,
      submittedAt: deposit.submittedAt,
      status: deposit.status,
      reviewedAt: deposit.reviewedAt,
      reviewNotes: deposit.reviewNotes
    };

    res.json({ status: deposit.status, deposit: safeDeposit });

  } catch (error) {
    console.error('Error getting deposit status:', error);
    res.status(500).json({ error: 'Failed to get deposit status' });
  }
});

// 📊 Get all deposits (Admin only)
router.get('/admin/all', verifyAdmin, (req, res) => {
  try {
    const deposits = readDeposits();
    
    // Add summary statistics
    const stats = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending').length,
      approved: deposits.filter(d => d.status === 'approved').length,
      rejected: deposits.filter(d => d.status === 'rejected').length
    };

    res.json({ deposits, stats });

  } catch (error) {
    console.error('Error getting deposits:', error);
    res.status(500).json({ error: 'Failed to get deposits' });
  }
});

// ✅ Approve deposit (Admin only)
router.post('/admin/:depositId/approve', verifyAdmin, async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reviewNotes } = req.body;
    const adminEmail = req.user.email;

    const deposits = readDeposits();
    const depositIndex = deposits.findIndex(d => d.id === depositId);

    if (depositIndex === -1) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const deposit = deposits[depositIndex];
    
    // Update deposit status
    deposits[depositIndex] = {
      ...deposit,
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminEmail,
      reviewNotes: reviewNotes || ''
    };

    writeDeposits(deposits);
    res.json({ message: 'Deposit approved successfully' });

  } catch (error) {
    console.error('Error approving deposit:', error);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

// ❌ Reject deposit (Admin only)
router.post('/admin/:depositId/reject', verifyAdmin, async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reviewNotes } = req.body;
    const adminEmail = req.user.email;

    const deposits = readDeposits();
    const depositIndex = deposits.findIndex(d => d.id === depositId);

    if (depositIndex === -1) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const deposit = deposits[depositIndex];
    
    // Update deposit status
    deposits[depositIndex] = {
      ...deposit,
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminEmail,
      reviewNotes: reviewNotes || ''
    };

    writeDeposits(deposits);
    res.json({ message: 'Deposit review completed' });

  } catch (error) {
    console.error('Error rejecting deposit:', error);
    res.status(500).json({ error: 'Failed to process deposit review' });
  }
});

// Legacy endpoints for backward compatibility
router.get('/:auctionId/:email', (req, res) => {
  const { auctionId, email } = req.params;
  const deposits = readDeposits();
  const entry = deposits.find(d => d.auctionId === auctionId && d.email === email);
  res.json(entry || { auctionId, email, status: 'not_paid' });
});

// POST: User marks deposit as paid (pending admin approval)
router.post('/:auctionId/:email', (req, res) => {
  const { auctionId, email } = req.params;
  const deposits = readDeposits();
  let entry = deposits.find(d => d.auctionId === auctionId && d.email === email);
  if (!entry) {
    entry = { auctionId, email, status: 'pending', notified: false };
    deposits.push(entry);
  } else {
    entry.status = 'pending';
    entry.notified = false;
  }
  writeDeposits(deposits);
  res.json(entry);
});

// PUT: Admin approves deposit - temporarily remove verifyAdmin
router.put('/:auctionId/:email', (req, res) => {
  const { auctionId, email } = req.params;
  const deposits = readDeposits();
  let entry = deposits.find(d => d.auctionId === auctionId && d.email === email);
  if (!entry) {
    return res.status(404).json({ error: 'No deposit record found' });
  }
  entry.status = req.body.status || 'approved';
  writeDeposits(deposits);
  res.json(entry);
});

// GET: List all deposits for an auction (admin) - temporarily remove verifyAdmin
router.get('/auction/:auctionId', (req, res) => {
  const { auctionId } = req.params;
  const deposits = readDeposits().filter(d => d.auctionId === auctionId);
  res.json(deposits);
});

module.exports = router;
