const express = require('express');
const fs = require('fs');
const path = require('path');
const verifyAdmin = require('../auth/verify-admin');
const dbModels = require('../../database/models');
const router = express.Router();

// Removed JSON file dependencies - using PostgreSQL only

// POST: Buyer requests refund for deposit - MIGRATED TO POSTGRESQL
router.post('/:auctionId/:email', async (req, res) => {
  try {
    const { auctionId, email } = req.params;
    const { reason } = req.body;
    
    // Check if refund already exists in PostgreSQL
    const existingRefund = await dbModels.getRefundRequest(auctionId, email);
    if (existingRefund && existingRefund.status === 'pending') {
      return res.status(400).json({ error: 'Refund already requested.' });
    }
    
    // Create refund request in PostgreSQL
    const requestData = {
      auction_id: auctionId,
      user_email: email,
      status: 'pending',
      reason: reason || 'Deposit refund requested'
    };
    
    const refundRequest = await dbModels.createRefundRequest(requestData);
    
    // If PostgreSQL fails, fallback to JSON file
    if (!refundRequest) {
      const refunds = readRefunds();
      if (refunds.find(r => r.auctionId === auctionId && r.email === email && r.status === 'pending')) {
        return res.status(400).json({ error: 'Refund already requested.' });
      }
      refunds.push({ auctionId, email, status: 'pending', requestedAt: new Date().toISOString() });
      writeRefunds(refunds);
    }
    
    res.json({ message: 'Refund requested.' });
  } catch (error) {
    console.error('Error creating refund request:', error);
    res.status(500).json({ error: 'Failed to create refund request' });
  }
});

// GET: Admin views all refund requests - MIGRATED TO POSTGRESQL
router.get('/', verifyAdmin, async (req, res) => {
  try {
    // Try PostgreSQL first
    const refunds = await dbModels.getAllRefundRequests();
    
    if (refunds.length > 0) {
      // Transform database fields to match expected format
      const transformedRefunds = refunds.map(refund => ({
        id: refund.id,
        auctionId: refund.auction_id,
        email: refund.user_email,
        status: refund.status,
        requestedAt: refund.requested_at,
        updatedAt: refund.updated_at,
        reason: refund.reason,
        adminNotes: refund.admin_notes
      }));
      return res.json(transformedRefunds);
    }
    
    // Fallback to JSON file if no database refunds
    const jsonRefunds = readRefunds();
    res.json(jsonRefunds);
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    // Fallback to JSON file on error
    const jsonRefunds = readRefunds();
    res.json(jsonRefunds);
  }
});

// PUT: Admin updates refund status - MIGRATED TO POSTGRESQL
router.put('/:auctionId/:email', verifyAdmin, async (req, res) => {
  try {
    const { auctionId, email } = req.params;
    const { status, adminNotes } = req.body;
    
    // Try to update in PostgreSQL first
    const updateData = {
      status: status || 'approved',
      admin_notes: adminNotes || '',
      processed_by: req.user?.email || 'admin'
    };
    
    const updatedRefund = await dbModels.updateRefundRequest(auctionId, email, updateData);
    
    if (updatedRefund) {
      // Transform to match expected format
      const response = {
        id: updatedRefund.id,
        auctionId: updatedRefund.auction_id,
        email: updatedRefund.user_email,
        status: updatedRefund.status,
        requestedAt: updatedRefund.requested_at,
        updatedAt: updatedRefund.updated_at,
        adminNotes: updatedRefund.admin_notes
      };
      return res.json(response);
    }
    
    // Fallback to JSON file if PostgreSQL fails
    const refunds = readRefunds();
    const refund = refunds.find(r => r.auctionId === auctionId && r.email === email);
    if (!refund) return res.status(404).json({ error: 'Refund request not found.' });
    
    refund.status = status || 'approved';
    refund.updatedAt = new Date().toISOString();
    refund.adminNotes = adminNotes || '';
    writeRefunds(refunds);
    res.json(refund);
    
  } catch (error) {
    console.error('Error updating refund request:', error);
    res.status(500).json({ error: 'Failed to update refund request' });
  }
});

module.exports = router;
