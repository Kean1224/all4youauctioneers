const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Data file paths
const invoicesPath = path.join(__dirname, '../../data/invoices.json');
const depositsPath = path.join(__dirname, '../../data/auctionDeposits.json');
const usersPath = path.join(__dirname, '../../data/users.json');

// Helper functions
const readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
};

// GET /api/payments/invoices - Get all invoices with payment status
router.get('/invoices', (req, res) => {
  try {
    const invoices = readJsonFile(invoicesPath);
    const users = readJsonFile(usersPath);
    
    // Enhance invoices with user details
    const enhancedInvoices = invoices.map(invoice => {
      const user = users.find(u => u.email === invoice.buyerEmail);
      return {
        ...invoice,
        buyerName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        paymentStatus: invoice.paymentStatus || 'pending',
        paymentDate: invoice.paymentDate || null,
        paymentMethod: invoice.paymentMethod || null,
        paymentReference: invoice.paymentReference || null
      };
    });

    res.json(enhancedInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// PUT /api/payments/invoices/:id/mark-paid - Mark invoice as paid
router.put('/invoices/:id/mark-paid', (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, notes } = req.body;
    
    const invoices = readJsonFile(invoicesPath);
    const invoiceIndex = invoices.findIndex(invoice => invoice.id === id);
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Update invoice with payment details
    invoices[invoiceIndex] = {
      ...invoices[invoiceIndex],
      paymentStatus: 'paid',
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentMethod || 'manual',
      paymentReference: paymentReference || '',
      paymentNotes: notes || '',
      markedPaidBy: 'admin', // Track who marked it as paid
      markedPaidAt: new Date().toISOString()
    };
    
    if (writeJsonFile(invoicesPath, invoices)) {
      res.json({ 
        message: 'Invoice marked as paid successfully',
        invoice: invoices[invoiceIndex]
      });
    } else {
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

// PUT /api/payments/invoices/:id/mark-unpaid - Mark invoice as unpaid
router.put('/invoices/:id/mark-unpaid', (req, res) => {
  try {
    const { id } = req.params;
    
    const invoices = readJsonFile(invoicesPath);
    const invoiceIndex = invoices.findIndex(invoice => invoice.id === id);
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Reset payment status
    invoices[invoiceIndex] = {
      ...invoices[invoiceIndex],
      paymentStatus: 'pending',
      paymentDate: null,
      paymentMethod: null,
      paymentReference: null,
      paymentNotes: null,
      markedUnpaidBy: 'admin',
      markedUnpaidAt: new Date().toISOString()
    };
    
    if (writeJsonFile(invoicesPath, invoices)) {
      res.json({ 
        message: 'Invoice marked as unpaid',
        invoice: invoices[invoiceIndex]
      });
    } else {
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  } catch (error) {
    console.error('Error marking invoice as unpaid:', error);
    res.status(500).json({ error: 'Failed to mark invoice as unpaid' });
  }
});

// GET /api/payments/deposits - Get all deposits with payment status
router.get('/deposits', (req, res) => {
  try {
    const deposits = readJsonFile(depositsPath);
    const users = readJsonFile(usersPath);
    
    // Enhance deposits with user details and payment status
    const enhancedDeposits = deposits.map(deposit => {
      const user = users.find(u => u.email === deposit.email);
      return {
        ...deposit,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        paymentStatus: deposit.paymentStatus || 'pending',
        paymentDate: deposit.paymentDate || null,
        paymentMethod: deposit.paymentMethod || null,
        paymentReference: deposit.paymentReference || null,
        depositAmount: deposit.depositAmount || 0
      };
    });

    res.json(enhancedDeposits);
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

// PUT /api/payments/deposits/:auctionId/:email/mark-paid - Mark deposit as paid
router.put('/deposits/:auctionId/:email/mark-paid', (req, res) => {
  try {
    const { auctionId, email } = req.params;
    const { paymentMethod, paymentReference, notes, depositAmount } = req.body;
    
    const deposits = readJsonFile(depositsPath);
    const depositIndex = deposits.findIndex(d => 
      d.auctionId === auctionId && d.email === decodeURIComponent(email)
    );
    
    if (depositIndex === -1) {
      return res.status(404).json({ error: 'Deposit not found' });
    }
    
    // Update deposit with payment details
    deposits[depositIndex] = {
      ...deposits[depositIndex],
      paymentStatus: 'paid',
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentMethod || 'manual',
      paymentReference: paymentReference || '',
      paymentNotes: notes || '',
      depositAmount: depositAmount || deposits[depositIndex].depositAmount || 0,
      markedPaidBy: 'admin',
      markedPaidAt: new Date().toISOString()
    };
    
    if (writeJsonFile(depositsPath, deposits)) {
      res.json({ 
        message: 'Deposit marked as paid successfully',
        deposit: deposits[depositIndex]
      });
    } else {
      res.status(500).json({ error: 'Failed to update deposit' });
    }
  } catch (error) {
    console.error('Error marking deposit as paid:', error);
    res.status(500).json({ error: 'Failed to mark deposit as paid' });
  }
});

// PUT /api/payments/deposits/:auctionId/:email/mark-unpaid - Mark deposit as unpaid
router.put('/deposits/:auctionId/:email/mark-unpaid', (req, res) => {
  try {
    const { auctionId, email } = req.params;
    
    const deposits = readJsonFile(depositsPath);
    const depositIndex = deposits.findIndex(d => 
      d.auctionId === auctionId && d.email === decodeURIComponent(email)
    );
    
    if (depositIndex === -1) {
      return res.status(404).json({ error: 'Deposit not found' });
    }
    
    // Reset payment status
    deposits[depositIndex] = {
      ...deposits[depositIndex],
      paymentStatus: 'pending',
      paymentDate: null,
      paymentMethod: null,
      paymentReference: null,
      paymentNotes: null,
      markedUnpaidBy: 'admin',
      markedUnpaidAt: new Date().toISOString()
    };
    
    if (writeJsonFile(depositsPath, deposits)) {
      res.json({ 
        message: 'Deposit marked as unpaid',
        deposit: deposits[depositIndex]
      });
    } else {
      res.status(500).json({ error: 'Failed to update deposit' });
    }
  } catch (error) {
    console.error('Error marking deposit as unpaid:', error);
    res.status(500).json({ error: 'Failed to mark deposit as unpaid' });
  }
});

// GET /api/payments/summary - Get payment summary statistics
router.get('/summary', (req, res) => {
  try {
    const invoices = readJsonFile(invoicesPath);
    const deposits = readJsonFile(depositsPath);
    
    // Calculate invoice statistics
    const invoiceStats = {
      total: invoices.length,
      paid: invoices.filter(i => i.paymentStatus === 'paid').length,
      pending: invoices.filter(i => i.paymentStatus !== 'paid').length,
      totalValue: invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      paidValue: invoices
        .filter(i => i.paymentStatus === 'paid')
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    };
    
    // Calculate deposit statistics
    const depositStats = {
      total: deposits.length,
      paid: deposits.filter(d => d.paymentStatus === 'paid').length,
      pending: deposits.filter(d => d.paymentStatus !== 'paid').length,
      totalValue: deposits.reduce((sum, d) => sum + (d.depositAmount || 0), 0),
      paidValue: deposits
        .filter(d => d.paymentStatus === 'paid')
        .reduce((sum, d) => sum + (d.depositAmount || 0), 0)
    };
    
    res.json({
      invoices: invoiceStats,
      deposits: depositStats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating payment summary:', error);
    res.status(500).json({ error: 'Failed to generate payment summary' });
  }
});

module.exports = router;
