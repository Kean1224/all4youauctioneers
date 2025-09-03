const express = require('express');
const router = express.Router();
const verifyAdmin = require('../auth/verify-admin');
const dbModels = require('../../database/models');

/**
 * Payment Management System - Admin Only
 * 
 * This system handles payment verification for offline payments (EFT/Bank Transfer).
 * No online payment processing - all payments handled offline.
 */

// GET /api/payments/invoices - Get all invoices with payment status (Admin Only)
router.get('/invoices', verifyAdmin, async (req, res) => {
  try {
    console.log('📋 Admin fetching all invoices for payment management...');
    
    // Get all invoices from database
    const invoices = await dbModels.getAllInvoices();
    
    if (!invoices || invoices.length === 0) {
      return res.json([]);
    }

    // Enhance invoices with user details for admin view
    const enhancedInvoices = [];
    
    for (const invoice of invoices) {
      try {
        // Get user details for each invoice
        const user = await dbModels.getUserByEmail(invoice.buyer_email);
        
        const enhancedInvoice = {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          buyerEmail: invoice.buyer_email,
          buyerName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User' : 'Unknown User',
          auctionId: invoice.auction_id,
          total: parseFloat(invoice.total_amount || 0),
          status: invoice.status || 'pending',
          paymentStatus: invoice.payment_status || 'unpaid',
          paymentDate: invoice.payment_date,
          paymentMethod: invoice.payment_method,
          paymentReference: invoice.payment_reference,
          adminNotes: invoice.admin_notes,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at,
          items: invoice.items || []
        };
        
        enhancedInvoices.push(enhancedInvoice);
        
      } catch (userError) {
        console.error(`Error fetching user for invoice ${invoice.id}:`, userError);
        
        // Add invoice without user details if user fetch fails
        enhancedInvoices.push({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          buyerEmail: invoice.buyer_email,
          buyerName: 'Unknown User',
          auctionId: invoice.auction_id,
          total: parseFloat(invoice.total_amount || 0),
          status: invoice.status || 'pending',
          paymentStatus: invoice.payment_status || 'unpaid',
          paymentDate: invoice.payment_date,
          paymentMethod: invoice.payment_method,
          paymentReference: invoice.payment_reference,
          adminNotes: invoice.admin_notes,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at,
          items: invoice.items || []
        });
      }
    }

    console.log(`✅ Retrieved ${enhancedInvoices.length} invoices for payment management`);
    res.json(enhancedInvoices);
    
  } catch (error) {
    console.error('❌ Error fetching invoices for payment management:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      details: error.message 
    });
  }
});

// PUT /api/payments/invoices/:id/mark-paid - Mark invoice as paid (Admin Only)
router.put('/invoices/:id/mark-paid', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, adminNotes } = req.body;
    
    console.log(`💰 Admin marking invoice ${id} as paid...`);
    
    // Validate required fields
    if (!paymentMethod) {
      return res.status(400).json({ 
        error: 'Payment method is required',
        hint: 'Specify how payment was received (EFT, Cash, Cheque, etc.)'
      });
    }

    // Update invoice payment status in database
    const updateData = {
      payment_status: 'paid',
      payment_date: new Date().toISOString(),
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      admin_notes: adminNotes || null,
      status: 'paid' // Update overall invoice status
    };

    const updatedInvoice = await dbModels.updateInvoice(id, updateData);
    
    if (!updatedInvoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    console.log(`✅ Invoice ${id} marked as paid via ${paymentMethod}`);
    
    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        paymentStatus: updatedInvoice.payment_status,
        paymentDate: updatedInvoice.payment_date,
        paymentMethod: updatedInvoice.payment_method,
        paymentReference: updatedInvoice.payment_reference,
        adminNotes: updatedInvoice.admin_notes
      }
    });
    
  } catch (error) {
    console.error('❌ Error marking invoice as paid:', error);
    res.status(500).json({ 
      error: 'Failed to mark invoice as paid',
      details: error.message 
    });
  }
});

// PUT /api/payments/invoices/:id/mark-unpaid - Mark invoice as unpaid (Admin Only)
router.put('/invoices/:id/mark-unpaid', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log(`❌ Admin marking invoice ${id} as unpaid...`);

    // Update invoice payment status in database
    const updateData = {
      payment_status: 'unpaid',
      payment_date: null,
      payment_method: null,
      payment_reference: null,
      admin_notes: reason || 'Payment reverted by admin',
      status: 'pending' // Reset overall invoice status
    };

    const updatedInvoice = await dbModels.updateInvoice(id, updateData);
    
    if (!updatedInvoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    console.log(`✅ Invoice ${id} marked as unpaid`);
    
    res.json({
      success: true,
      message: 'Invoice marked as unpaid successfully',
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        paymentStatus: updatedInvoice.payment_status,
        adminNotes: updatedInvoice.admin_notes
      }
    });
    
  } catch (error) {
    console.error('❌ Error marking invoice as unpaid:', error);
    res.status(500).json({ 
      error: 'Failed to mark invoice as unpaid',
      details: error.message 
    });
  }
});

// GET /api/payments/invoices/:id - Get specific invoice details (Admin Only)
router.get('/invoices/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Admin fetching invoice ${id} details...`);
    
    const invoice = await dbModels.getInvoiceById(id);
    
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    // Get buyer details
    let buyerDetails = null;
    try {
      buyerDetails = await dbModels.getUserByEmail(invoice.buyer_email);
    } catch (userError) {
      console.error('Error fetching buyer details:', userError);
    }

    const detailedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      buyerEmail: invoice.buyer_email,
      buyerName: buyerDetails ? 
        `${buyerDetails.first_name || ''} ${buyerDetails.last_name || ''}`.trim() || 'Unknown User' : 
        'Unknown User',
      buyerPhone: buyerDetails?.phone || 'N/A',
      auctionId: invoice.auction_id,
      total: parseFloat(invoice.total_amount || 0),
      status: invoice.status || 'pending',
      paymentStatus: invoice.payment_status || 'unpaid',
      paymentDate: invoice.payment_date,
      paymentMethod: invoice.payment_method,
      paymentReference: invoice.payment_reference,
      adminNotes: invoice.admin_notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      items: invoice.items || []
    };

    console.log(`✅ Retrieved detailed invoice information for ${id}`);
    res.json(detailedInvoice);
    
  } catch (error) {
    console.error('❌ Error fetching invoice details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoice details',
      details: error.message 
    });
  }
});

// GET /api/payments/stats - Get payment statistics (Admin Only)
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    console.log('📊 Admin fetching payment statistics...');
    
    const invoices = await dbModels.getAllInvoices();
    
    const stats = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(inv => inv.payment_status === 'paid').length,
      unpaidInvoices: invoices.filter(inv => inv.payment_status !== 'paid').length,
      totalRevenue: invoices
        .filter(inv => inv.payment_status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
      pendingRevenue: invoices
        .filter(inv => inv.payment_status !== 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
    };

    console.log(`✅ Payment statistics: ${stats.paidInvoices}/${stats.totalInvoices} paid, R${stats.totalRevenue.toFixed(2)} received`);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Error fetching payment statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment statistics',
      details: error.message 
    });
  }
});

module.exports = router;