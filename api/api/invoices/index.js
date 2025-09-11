const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');
const { InvoicePDFGenerator } = require('../../utils/invoicePDFGenerator');
const dbModels = require('../../database/models');

const router = express.Router();

// Ensure invoice PDF directory exists
const INVOICES_DIR = path.join(__dirname, '../../uploads/invoices');
if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

/**
 * Invoice Management System - PostgreSQL Only
 * 
 * Handles invoice generation, retrieval, and PDF creation for auction winners.
 * All data stored in PostgreSQL database - no JSON file dependencies.
 */

// GET /api/invoices - Get all invoices (Admin) or user's invoices (User)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log(`📋 ${req.user.role === 'admin' ? 'Admin' : 'User'} fetching invoices...`);
    
    let invoices;
    
    if (req.user.role === 'admin') {
      // Admin: Get all invoices
      invoices = await dbModels.getAllInvoices();
    } else {
      // User: Get only their invoices
      invoices = await dbModels.getInvoicesByBuyer(req.user.email);
    }
    
    if (!invoices || invoices.length === 0) {
      return res.json([]);
    }

    // Format invoices for response
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      buyerEmail: invoice.buyer_email,
      auctionId: invoice.auction_id,
      total: parseFloat(invoice.total_amount || 0),
      status: invoice.status || 'pending',
      paymentStatus: invoice.payment_status || 'unpaid',
      paymentDate: invoice.payment_date,
      paymentMethod: invoice.payment_method,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      items: invoice.items || []
    }));

    console.log(`✅ Retrieved ${formattedInvoices.length} invoices`);
    res.json(formattedInvoices);
    
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoices',
      details: error.message 
    });
  }
});

// GET /api/invoices/:id - Get specific invoice details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching invoice ${id}...`);
    
    const invoice = await dbModels.getInvoiceById(id);
    
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    // Check authorization: admin can see all, users can only see their own
    if (req.user.role !== 'admin' && invoice.buyer_email !== req.user.email) {
      return res.status(403).json({ 
        error: 'Access denied',
        hint: 'You can only view your own invoices'
      });
    }

    const formattedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      buyerEmail: invoice.buyer_email,
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

    console.log(`✅ Retrieved invoice details for ${id}`);
    res.json(formattedInvoice);
    
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invoice',
      details: error.message 
    });
  }
});

// POST /api/invoices/generate - Generate new invoice for auction winner (Admin Only)
router.post('/generate', verifyAdmin, async (req, res) => {
  try {
    const { auctionId, buyerEmail, items } = req.body;
    
    console.log(`💰 Admin generating invoice for auction ${auctionId}, buyer ${buyerEmail}...`);
    
    // Validate required fields
    if (!auctionId || !buyerEmail || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['auctionId', 'buyerEmail', 'items'],
        hint: 'Provide auction ID, buyer email, and array of items'
      });
    }

    // Check if buyer exists
    const buyer = await dbModels.getUserByEmail(buyerEmail);
    if (!buyer) {
      return res.status(404).json({ 
        error: 'Buyer not found',
        hint: 'Make sure the buyer email is correct and user is registered'
      });
    }

    // Check if invoice already exists for this auction and buyer
    const existingInvoice = await dbModels.getInvoiceByAuctionAndBuyer(auctionId, buyerEmail);
    if (existingInvoice) {
      return res.status(400).json({ 
        error: 'Invoice already exists',
        existingInvoice: {
          id: existingInvoice.id,
          invoiceNumber: existingInvoice.invoice_number
        },
        hint: 'Use PUT to update existing invoice instead'
      });
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const itemTotal = parseFloat(item.winningBid || item.amount || 0);
      subtotal += itemTotal;
      
      return {
        lotId: item.lotId,
        title: item.title || `Lot ${item.lotId}`,
        description: item.description || '',
        winningBid: itemTotal,
        commission: parseFloat(item.commission || 0),
        total: itemTotal + parseFloat(item.commission || 0)
      };
    });

    // Calculate fees (15% buyer's premium, 15% VAT)
    const buyersPremium = subtotal * 0.15;
    const vat = (subtotal + buyersPremium) * 0.15;
    const totalAmount = subtotal + buyersPremium + vat;

    // Generate unique invoice number
    const invoiceNumber = `INV-${auctionId.toUpperCase()}-${Date.now()}`;

    // Create invoice in database
    const invoiceData = {
      invoice_number: invoiceNumber,
      buyer_email: buyerEmail,
      auction_id: auctionId,
      total_amount: totalAmount.toFixed(2),
      status: 'pending',
      payment_status: 'unpaid',
      items: processedItems
    };

    const newInvoice = await dbModels.createInvoice(invoiceData);

    if (!newInvoice) {
      throw new Error('Failed to create invoice in database');
    }

    console.log(`✅ Invoice generated: ${invoiceNumber} for R${totalAmount.toFixed(2)}`);

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      invoice: {
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoice_number,
        buyerEmail: newInvoice.buyer_email,
        auctionId: newInvoice.auction_id,
        total: parseFloat(newInvoice.total_amount),
        status: newInvoice.status,
        paymentStatus: newInvoice.payment_status,
        createdAt: newInvoice.created_at,
        items: processedItems,
        breakdown: {
          subtotal: subtotal.toFixed(2),
          buyersPremium: buyersPremium.toFixed(2),
          vat: vat.toFixed(2),
          total: totalAmount.toFixed(2)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice',
      details: error.message 
    });
  }
});

// GET /api/invoices/:id/pdf - Generate and download PDF invoice
router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 Generating PDF for invoice ${id}...`);
    
    const invoice = await dbModels.getInvoiceById(id);
    
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    // Check authorization: admin can see all, users can only see their own
    if (req.user.role !== 'admin' && invoice.buyer_email !== req.user.email) {
      return res.status(403).json({ 
        error: 'Access denied',
        hint: 'You can only download your own invoices'
      });
    }

    // Get buyer details for PDF
    const buyer = await dbModels.getUserByEmail(invoice.buyer_email);
    if (!buyer) {
      throw new Error('Buyer details not found');
    }

    // Prepare PDF data
    const pdfData = {
      invoiceNumber: invoice.invoice_number,
      buyerName: `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || 'Unknown Buyer',
      buyerEmail: invoice.buyer_email,
      buyerPhone: buyer.phone || 'N/A',
      auctionId: invoice.auction_id,
      total: parseFloat(invoice.total_amount || 0),
      status: invoice.status || 'pending',
      paymentStatus: invoice.payment_status || 'unpaid',
      createdAt: invoice.created_at,
      items: invoice.items || []
    };

    // Generate PDF using InvoicePDFGenerator
    const pdfGenerator = new InvoicePDFGenerator();
    const pdfBuffer = await pdfGenerator.generateInvoicePDF(pdfData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log(`✅ PDF generated for invoice ${invoice.invoice_number}`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      details: error.message 
    });
  }
});

// PUT /api/invoices/:id - Update invoice (Admin Only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`✏️ Admin updating invoice ${id}...`);
    
    // Get current invoice
    const currentInvoice = await dbModels.getInvoiceById(id);
    if (!currentInvoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    // Update invoice in database
    const updatedInvoice = await dbModels.updateInvoice(id, updates);
    
    if (!updatedInvoice) {
      throw new Error('Failed to update invoice');
    }

    console.log(`✅ Invoice ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        buyerEmail: updatedInvoice.buyer_email,
        auctionId: updatedInvoice.auction_id,
        total: parseFloat(updatedInvoice.total_amount || 0),
        status: updatedInvoice.status,
        paymentStatus: updatedInvoice.payment_status,
        updatedAt: updatedInvoice.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to update invoice',
      details: error.message 
    });
  }
});

// DELETE /api/invoices/:id - Delete invoice (Admin Only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Admin deleting invoice ${id}...`);
    
    const invoice = await dbModels.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    // Delete invoice from database
    const deleted = await dbModels.deleteInvoice(id);
    
    if (!deleted) {
      throw new Error('Failed to delete invoice');
    }

    console.log(`✅ Invoice ${id} deleted successfully`);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
      deletedInvoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting invoice:', error);
    res.status(500).json({ 
      error: 'Failed to delete invoice',
      details: error.message 
    });
  }
});

// POST /api/invoices/admin/:id/mark-paid - Admin marks invoice as paid
router.post('/admin/:id/mark-paid', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`💰 Admin marking invoice ${id} as paid...`);
    
    // Get current invoice
    const currentInvoice = await dbModels.getInvoiceById(id);
    if (!currentInvoice) {
      return res.status(404).json({ 
        error: 'Invoice not found',
        hint: 'Check if the invoice ID is correct'
      });
    }

    if (currentInvoice.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Invoice is already marked as paid'
      });
    }

    // Mark invoice as paid (manual admin action)
    const updatedInvoice = await dbModels.markInvoiceAsPaid(id, {
      payment_method: 'Manual Verification',
      payment_date: new Date().toISOString(),
      payment_reference: `Admin-${req.user.email}-${Date.now()}`
    });
    
    if (!updatedInvoice) {
      throw new Error('Failed to mark invoice as paid');
    }

    console.log(`✅ Invoice ${id} marked as paid by admin: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        buyerEmail: updatedInvoice.buyer_email,
        paymentStatus: updatedInvoice.payment_status,
        paymentMethod: updatedInvoice.payment_method,
        paymentDate: updatedInvoice.payment_date,
        paymentReference: updatedInvoice.payment_reference
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

module.exports = router;