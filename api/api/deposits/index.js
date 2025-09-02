const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');
const dbModels = require('../../database/models');
const cloudinaryService = require('../../services/cloudinaryService');

const router = express.Router();

// Legacy paths for backward compatibility (not used with PostgreSQL)
const DEPOSITS_FILE = path.join(__dirname, '../../data/auctionDeposits.json');
const DEPOSITS_UPLOAD_DIR = path.join(__dirname, '../../uploads/deposits');

// Configure multer for memory storage (files will be stored in PostgreSQL)
const storage = multer.memoryStorage();

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

// Helper functions - migrated from JSON files to PostgreSQL
const getAuctionById = async (auctionId) => {
  try {
    // Try PostgreSQL first
    const auction = await dbModels.getAuctionById(auctionId);
    if (auction) return auction;
    
    // Fall back to JSON file for legacy compatibility
    const auctionsPath = path.join(__dirname, '../../data/auctions.json');
    if (fs.existsSync(auctionsPath)) {
      const data = fs.readFileSync(auctionsPath, 'utf8');
      const auctions = JSON.parse(data);
      return auctions.find(a => a.id === auctionId);
    }
    return null;
  } catch (error) {
    console.error('Error getting auction:', error);
    return null;
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

// 📤 Submit deposit proof (User endpoint) - MIGRATED TO POSTGRESQL
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
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if deposit already submitted for this auction
    const existingDeposit = await dbModels.getDepositByUserAndAuction(userEmail, auctionId);
    if (existingDeposit && existingDeposit.status !== 'rejected') {
      return res.status(400).json({ 
        error: 'Deposit already submitted for this auction', 
        status: existingDeposit.status 
      });
    }

    // Create new deposit record
    const depositData = {
      user_email: userEmail,
      auction_id: auctionId,
      auction_title: auction.title,
      amount: parseFloat(amount),
      required_amount: auction.depositAmount || 0,
      payment_method: paymentMethod,
      reference_number: referenceNumber || '',
      notes: notes || '',
      proof_file_data: await (async () => {
        console.log('📄 Uploading deposit proof to Cloudinary...');
        const uploadResult = await cloudinaryService.uploadDepositProof(req.file.buffer, {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          userEmail: userEmail
        });
        console.log('✅ Deposit proof uploaded:', uploadResult.url);
        return uploadResult.url;
      })(),
      proof_original_name: req.file.originalname,
      status: 'pending'
    };

    const deposit = await dbModels.createDeposit(depositData);

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

// 📋 Get user's deposit status for an auction - MIGRATED TO POSTGRESQL
router.get('/status/:auctionId', authenticateToken, async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userEmail = req.user.email;

    const deposit = await dbModels.getDepositByUserAndAuction(userEmail, auctionId);

    if (!deposit) {
      return res.json({ status: 'not_submitted', deposit: null });
    }

    // Remove sensitive file data from response
    const safeDeposit = {
      id: deposit.id,
      auctionId: deposit.auction_id,
      auctionTitle: deposit.auction_title,
      amount: deposit.amount,
      requiredAmount: deposit.required_amount,
      paymentMethod: deposit.payment_method,
      referenceNumber: deposit.reference_number,
      submittedAt: deposit.submitted_at,
      status: deposit.status,
      reviewedAt: deposit.reviewed_at,
      reviewNotes: deposit.review_notes
    };

    res.json({ status: deposit.status, deposit: safeDeposit });

  } catch (error) {
    console.error('Error getting deposit status:', error);
    res.status(500).json({ error: 'Failed to get deposit status' });
  }
});

// 📊 Get all deposits (Admin only) - MIGRATED TO POSTGRESQL
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    const deposits = await dbModels.getAllDeposits();
    
    // Add summary statistics
    const stats = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending').length,
      approved: deposits.filter(d => d.status === 'approved').length,
      rejected: deposits.filter(d => d.status === 'rejected').length
    };

    // Transform database fields to match frontend expectations
    const transformedDeposits = deposits.map(d => ({
      id: d.id,
      userEmail: d.user_email,
      auctionId: d.auction_id,
      auctionTitle: d.auction_title,
      amount: d.amount,
      requiredAmount: d.required_amount,
      paymentMethod: d.payment_method,
      referenceNumber: d.reference_number,
      notes: d.notes,
      proofOriginalName: d.proof_original_name,
      submittedAt: d.submitted_at,
      status: d.status,
      reviewedAt: d.reviewed_at,
      reviewedBy: d.reviewed_by,
      reviewNotes: d.review_notes
    }));

    res.json({ deposits: transformedDeposits, stats });

  } catch (error) {
    console.error('Error getting deposits:', error);
    res.status(500).json({ error: 'Failed to get deposits' });
  }
});

// ✅ Approve deposit (Admin only) - MIGRATED TO POSTGRESQL
router.post('/admin/:depositId/approve', verifyAdmin, async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reviewNotes } = req.body;
    const adminEmail = req.user.email;

    const deposit = await dbModels.getDepositById(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Update deposit status
    const reviewData = {
      reviewed_by: adminEmail,
      review_notes: reviewNotes || ''
    };

    await dbModels.updateDepositStatus(depositId, 'approved', reviewData);
    res.json({ message: 'Deposit approved successfully' });

  } catch (error) {
    console.error('Error approving deposit:', error);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

// ❌ Reject deposit (Admin only) - MIGRATED TO POSTGRESQL
router.post('/admin/:depositId/reject', verifyAdmin, async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reviewNotes } = req.body;
    const adminEmail = req.user.email;

    const deposit = await dbModels.getDepositById(depositId);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Update deposit status
    const reviewData = {
      reviewed_by: adminEmail,
      review_notes: reviewNotes || ''
    };

    await dbModels.updateDepositStatus(depositId, 'rejected', reviewData);
    res.json({ message: 'Deposit review completed' });

  } catch (error) {
    console.error('Error rejecting deposit:', error);
    res.status(500).json({ error: 'Failed to process deposit review' });
  }
});

// Legacy endpoints for backward compatibility - MIGRATED TO POSTGRESQL
router.get('/:auctionId/:email', async (req, res) => {
  try {
    const { auctionId, email } = req.params;
    const deposit = await dbModels.getDepositByUserAndAuction(email, auctionId);
    
    if (!deposit) {
      return res.json({ auctionId, email, status: 'not_paid' });
    }
    
    // Transform to legacy format
    const legacyDeposit = {
      id: deposit.id,
      auctionId: deposit.auction_id,
      email: deposit.user_email,
      status: deposit.status,
      amount: deposit.amount,
      submittedAt: deposit.submitted_at
    };
    
    res.json(legacyDeposit);
  } catch (error) {
    console.error('Error getting deposit:', error);
    res.status(500).json({ error: 'Failed to get deposit' });
  }
});

// POST: User marks deposit as paid (pending admin approval)
router.post('/:auctionId/:email', async (req, res) => {
  try {
    const { auctionId, email } = req.params;
    
    let deposit = await dbModels.getDepositByUserAndAuction(email, auctionId);
    
    if (!deposit) {
      // Create new deposit entry
      const depositData = {
        user_email: email,
        auction_id: auctionId,
        auction_title: 'Legacy Entry',
        amount: 0,
        payment_method: 'legacy',
        status: 'pending'
      };
      deposit = await dbModels.createDeposit(depositData);
    } else {
      // Update existing deposit
      await dbModels.updateDepositStatus(deposit.id, 'pending');
      deposit.status = 'pending';
    }
    
    res.json({
      id: deposit.id,
      auctionId: deposit.auction_id,
      email: deposit.user_email,
      status: 'pending',
      notified: false
    });
  } catch (error) {
    console.error('Error updating deposit:', error);
    res.status(500).json({ error: 'Failed to update deposit' });
  }
});

// PUT: Admin approves deposit - ADMIN AUTHENTICATION REQUIRED
router.put('/:auctionId/:email', verifyAdmin, async (req, res) => {
  try {
    const { auctionId, email } = req.params;
    const { status = 'approved' } = req.body;
    
    const deposit = await dbModels.getDepositByUserAndAuction(email, auctionId);
    if (!deposit) {
      return res.status(404).json({ error: 'No deposit record found' });
    }
    
    const reviewData = {
      reviewed_by: req.user?.email || 'admin',
      review_notes: 'Legacy approval'
    };
    
    const updatedDeposit = await dbModels.updateDepositStatus(deposit.id, status, reviewData);
    
    res.json({
      id: updatedDeposit.id,
      auctionId: updatedDeposit.auction_id,
      email: updatedDeposit.user_email,
      status: updatedDeposit.status
    });
  } catch (error) {
    console.error('Error approving deposit:', error);
    res.status(500).json({ error: 'Failed to approve deposit' });
  }
});

// GET: List all deposits for an auction (admin)
router.get('/auction/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const deposits = await dbModels.getDepositsByAuction(auctionId);
    
    // Transform to legacy format
    const legacyDeposits = deposits.map(d => ({
      id: d.id,
      auctionId: d.auction_id,
      email: d.user_email,
      userEmail: d.user_email,
      status: d.status,
      amount: d.amount,
      paymentMethod: d.payment_method,
      submittedAt: d.submitted_at,
      reviewedAt: d.reviewed_at
    }));
    
    res.json(legacyDeposits);
  } catch (error) {
    console.error('Error getting auction deposits:', error);
    res.status(500).json({ error: 'Failed to get auction deposits' });
  }
});

module.exports = router;
