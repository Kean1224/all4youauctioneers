const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');
const { InvoicePDFGenerator } = require('../../utils/invoicePDFGenerator');
const dbModels = require('../../database/models');

const router = express.Router();

// Legacy invoice storage paths (fallback)
const INVOICES_FILE = path.join(__dirname, '../../data/invoices.json');
const INVOICES_DIR = path.join(__dirname, '../../uploads/invoices');

// Ensure invoice directory exists
if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

// Helper functions
const readInvoices = () => {
  try {
    if (fs.existsSync(INVOICES_FILE)) {
      const data = fs.readFileSync(INVOICES_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading invoices file:', error);
    return [];
  }
};

const writeInvoices = (invoices) => {
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2));
  } catch (error) {
    console.error('Error writing invoices file:', error);
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
  console.log('⚠️  Email service not available for invoices');
  sendMail = async () => Promise.resolve();
}

// Generate comprehensive PDF invoice using enhanced template
const generateInvoicePDF = async (invoiceData) => {
  try {
    const fileName = `invoice_${invoiceData.invoiceNumber}.pdf`;
    const filePath = path.join(INVOICES_DIR, fileName);
    
    // Check for company logo (optional)
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    const logoExists = fs.existsSync(logoPath) ? logoPath : null;
    
    // Create PDF generator instance
    const pdfGenerator = new InvoicePDFGenerator();
    
    // Generate the PDF
    const result = await pdfGenerator.generateInvoice(invoiceData, filePath, logoExists);
    
    console.log(`✅ Enhanced PDF invoice generated: ${fileName} (${(result.size / 1024).toFixed(1)}KB)`);
    
    return {
      fileName: result.fileName,
      filePath: result.filePath,
      size: result.size
    };
    
  } catch (error) {
    console.error('❌ Error generating enhanced PDF invoice:', error);
    throw error;
  }
};

// 📄 Generate buyer invoice for won lots
router.post('/generate/buyer/:auctionId/:userEmail', authenticateToken, async (req, res) => {
  try {
    const { auctionId, userEmail } = req.params;
    const requestingUser = req.user.email;
    
    // Only allow users to generate their own invoices or admins to generate any
    if (requestingUser !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const auctions = readAuctions();
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Find lots won by user
    const wonLots = auction.lots.filter(lot => {
      const lastBid = lot.bidHistory && lot.bidHistory.length > 0 
        ? lot.bidHistory[lot.bidHistory.length - 1] 
        : null;
      return lastBid && lastBid.bidderEmail === userEmail;
    });

    if (wonLots.length === 0) {
      return res.status(404).json({ error: 'No won lots found for this user' });
    }

    // Check if invoice already exists in PostgreSQL first
    try {
      const existingInvoices = await dbModels.getAllInvoices();
      const existingInvoice = existingInvoices.find(inv => 
        inv.auction_id === auctionId && 
        inv.buyer_email === userEmail
      );

      if (existingInvoice) {
        return res.json({ 
          message: 'Invoice already exists', 
          invoice: {
            id: existingInvoice.id,
            auctionId: existingInvoice.auction_id,
            userEmail: existingInvoice.buyer_email,
            invoiceNumber: existingInvoice.invoice_number,
            totalAmount: existingInvoice.total_amount,
            paymentStatus: existingInvoice.payment_status
          },
          downloadUrl: `/api/invoices/download/${existingInvoice.id}`
        });
      }
    } catch (error) {
      console.log('Error checking existing invoices in PostgreSQL, checking JSON fallback');
      
      // Fallback to JSON file check
      const existingInvoices = readInvoices();
      const existingInvoice = existingInvoices.find(inv => 
        inv.auctionId === auctionId && 
        inv.userEmail === userEmail && 
        inv.type === 'buyer'
      );

      if (existingInvoice) {
        return res.json({ 
          message: 'Invoice already exists', 
          invoice: existingInvoice,
          downloadUrl: `/api/invoices/download/${existingInvoice.id}`
        });
      }
    }

    // Calculate totals - CORRECTED VAT CALCULATION
    const items = wonLots.map(lot => {
      const winningBid = parseFloat(lot.currentBid) || 0;
      const commission = winningBid * 0.10; // 10% buyer's premium
      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber || lot.id,
        title: lot.title,
        winningBid: winningBid,
        commission: commission
      };
    });

    // Calculate subtotals
    const lotSubtotal = items.reduce((sum, item) => sum + item.winningBid, 0);
    const commissionSubtotal = items.reduce((sum, item) => sum + item.commission, 0);
    
    // VAT on commission only (standard practice for auction houses)
    const commissionVAT = commissionSubtotal * 0.15; // 15% VAT on commission
    const total = lotSubtotal + commissionSubtotal + commissionVAT;

    // Generate invoice number
    const invoiceNumber = `BUY-${auctionId.toUpperCase()}-${Date.now()}`;

    const invoiceData = {
      id: invoiceNumber,
      invoiceNumber,
      type: 'buyer',
      auctionId,
      auctionTitle: auction.title,
      userEmail,
      items,
      lotSubtotal,
      commissionSubtotal,
      commissionVAT,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      pdfPath: null
    };

    // Generate PDF
    const pdfResult = await generateInvoicePDF(invoiceData);
    invoiceData.pdfPath = pdfResult.filePath;

    // Save invoice
    existingInvoices.push(invoiceData);
    writeInvoices(existingInvoices);

    // Send email notification
    try {
      await sendMail({
        to: userEmail,
        subject: `Invoice Generated - ${auction.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">📄 Your Invoice is Ready</h2>
            <p>Your buyer invoice for <strong>${auction.title}</strong> has been generated.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Invoice Summary:</h3>
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Items Won:</strong> ${items.length} lot(s)</p>
              <p><strong>Total Amount:</strong> R${total.toLocaleString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/api/invoices/download/${invoiceNumber}" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                📥 Download Invoice (PDF)
              </a>
            </div>
            
            <div style="background: #fefce8; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #a16207;">Payment Instructions:</h4>
              <p style="color: #a16207;">
                Bank: FNB<br>
                Account: 123456789<br>
                Branch: 250655<br>
                Reference: ${invoiceNumber}
              </p>
            </div>
            
            <p>Please complete payment within 7 days and email proof to admin@all4youauctions.co.za</p>
            
            <p>Best regards,<br><strong>ALL4YOU AUCTIONEERS Team</strong></p>
          </div>
        `,
        text: `
Invoice Generated - ${auction.title}

Your buyer invoice has been generated.

Invoice Number: ${invoiceNumber}
Items Won: ${items.length} lot(s)
Total: R${total.toLocaleString()}
Due: ${new Date(invoiceData.dueDate).toLocaleDateString()}

Payment Instructions:
Bank: FNB | Account: 123456789 | Branch: 250655
Reference: ${invoiceNumber}

Download: ${process.env.FRONTEND_URL}/api/invoices/download/${invoiceNumber}

- ALL4YOU AUCTIONEERS Team
        `
      });
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
    }

    res.json({ 
      message: 'Invoice generated successfully', 
      invoice: invoiceData,
      downloadUrl: `/api/invoices/download/${invoiceNumber}`
    });

  } catch (error) {
    console.error('Error generating buyer invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// 📄 Generate seller invoice for sold lots
router.post('/generate/seller/:auctionId/:userEmail', verifyAdmin, async (req, res) => {
  try {
    const { auctionId, userEmail } = req.params;

    const auctions = readAuctions();
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Find lots sold by user (this would need lot owner information)
    // For now, assuming lot has sellerEmail property
    const soldLots = auction.lots.filter(lot => 
      lot.sellerEmail === userEmail && 
      lot.bidHistory && 
      lot.bidHistory.length > 0
    );

    if (soldLots.length === 0) {
      return res.status(404).json({ error: 'No sold lots found for this seller' });
    }

    // Calculate seller payment (winning bid minus commission)
    const items = soldLots.map(lot => {
      const commission = lot.currentBid * 0.15; // 15% seller's commission
      const sellerReceives = lot.currentBid - commission;
      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber || lot.id,
        title: lot.title,
        winningBid: lot.currentBid,
        commission: commission,
        sellerReceives: sellerReceives
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.sellerReceives, 0);
    const vat = 0; // Seller invoices typically don't include VAT on payouts
    const total = subtotal;

    const invoiceNumber = `SELL-${auctionId.toUpperCase()}-${Date.now()}`;

    const invoiceData = {
      id: invoiceNumber,
      invoiceNumber,
      type: 'seller',
      auctionId,
      auctionTitle: auction.title,
      userEmail,
      items,
      subtotal,
      vat,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      pdfPath: null
    };

    // Generate PDF
    const pdfResult = await generateInvoicePDF(invoiceData);
    invoiceData.pdfPath = pdfResult.filePath;

    // Save invoice
    const existingInvoices = readInvoices();
    existingInvoices.push(invoiceData);
    writeInvoices(existingInvoices);

    res.json({ 
      message: 'Seller invoice generated successfully', 
      invoice: invoiceData,
      downloadUrl: `/api/invoices/download/${invoiceNumber}`
    });

  } catch (error) {
    console.error('Error generating seller invoice:', error);
    res.status(500).json({ error: 'Failed to generate seller invoice' });
  }
});

// 📥 Download invoice PDF
router.get('/download/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoices = readInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      return res.status(404).json({ error: 'Invoice PDF not found' });
    }

    res.download(invoice.pdfPath, `${invoice.invoiceNumber}.pdf`);

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

// 📊 Get buyer invoices (frontend compatibility)
router.get('/buyer/:email', authenticateToken, (req, res) => {
  try {
    const { email } = req.params;
    const requestingUser = req.user.email;
    
    // Only allow users to see their own invoices or admins to see any
    if (requestingUser !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoices = readInvoices();
    const buyerInvoices = invoices.filter(inv => 
      inv.type === 'buyer' && inv.userEmail === email
    );

    // Remove file paths from response
    const safeInvoices = buyerInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
      auctionId: inv.auctionId,
      auctionTitle: inv.auctionTitle,
      total: inv.total,
      status: inv.status,
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
      itemCount: inv.items.length
    }));

    res.json(safeInvoices);

  } catch (error) {
    console.error('Error getting buyer invoices:', error);
    res.status(500).json({ error: 'Failed to get buyer invoices' });
  }
});

// 📊 Get seller invoices (frontend compatibility)
router.get('/seller/:email', authenticateToken, (req, res) => {
  try {
    const { email } = req.params;
    const requestingUser = req.user.email;
    
    // Only allow users to see their own invoices or admins to see any
    if (requestingUser !== email && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoices = readInvoices();
    const sellerInvoices = invoices.filter(inv => 
      inv.type === 'seller' && (inv.sellerEmail === email || inv.userEmail === email)
    );

    // Remove file paths from response
    const safeInvoices = sellerInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
      auctionId: inv.auctionId,
      auctionTitle: inv.auctionTitle,
      total: inv.total,
      status: inv.status,
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
      itemCount: inv.items.length
    }));

    res.json(safeInvoices);

  } catch (error) {
    console.error('Error getting seller invoices:', error);
    res.status(500).json({ error: 'Failed to get seller invoices' });
  }
});

// 📊 Get user's invoices (legacy endpoint)
router.get('/user/:userEmail', authenticateToken, (req, res) => {
  try {
    const { userEmail } = req.params;
    const requestingUser = req.user.email;
    
    // Only allow users to see their own invoices or admins to see any
    if (requestingUser !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoices = readInvoices();
    const userInvoices = invoices.filter(inv => inv.userEmail === userEmail);

    // Remove file paths from response
    const safeInvoices = userInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: inv.type,
      auctionId: inv.auctionId,
      auctionTitle: inv.auctionTitle,
      total: inv.total,
      status: inv.status,
      createdAt: inv.createdAt,
      dueDate: inv.dueDate,
      itemCount: inv.items.length
    }));

    res.json(safeInvoices);

  } catch (error) {
    console.error('Error getting user invoices:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// 📊 Get all invoices (Admin only)
router.get('/admin/all', verifyAdmin, (req, res) => {
  try {
    const invoices = readInvoices();
    
    // Add summary statistics
    const stats = {
      total: invoices.length,
      pending: invoices.filter(inv => inv.status === 'pending').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => 
        inv.status === 'pending' && new Date(inv.dueDate) < new Date()
      ).length,
      totalValue: invoices.reduce((sum, inv) => sum + inv.total, 0)
    };

    res.json({ invoices, stats });

  } catch (error) {
    console.error('Error getting all invoices:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// ✅ Mark invoice as paid (frontend compatibility)
router.put('/:invoiceId/paid', verifyAdmin, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentDate, notes } = req.body;

    const invoices = readInvoices();
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);

    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[invoiceIndex];
    
    // Update invoice status
    invoices[invoiceIndex] = {
      ...invoice,
      status: 'paid',
      paidAt: paymentDate || new Date().toISOString(),
      paymentNotes: notes || ''
    };

    writeInvoices(invoices);

    res.json({ 
      message: 'Invoice marked as paid successfully',
      invoice: invoices[invoiceIndex]
    });

  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

// 📧 Auto-email invoices for all winners in an auction
router.post('/email-invoices/:auctionId', verifyAdmin, async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    const auctions = readAuctions();
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Find all winners in this auction
    const winners = new Set();
    auction.lots.forEach(lot => {
      if (lot.bidHistory && lot.bidHistory.length > 0) {
        const lastBid = lot.bidHistory[lot.bidHistory.length - 1];
        winners.add(lastBid.bidderEmail);
      }
    });

    const results = [];
    const errors = [];

    // Generate and email invoice for each winner
    for (const winnerEmail of winners) {
      try {
        // Generate buyer invoice
        const invoiceResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/invoices/generate/buyer/${auctionId}/${winnerEmail}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization // Pass admin token
          }
        });

        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          results.push({
            email: winnerEmail,
            status: 'success',
            invoiceId: invoiceData.invoice.id
          });
        } else {
          const errorText = await invoiceResponse.text();
          errors.push({
            email: winnerEmail,
            status: 'failed',
            error: errorText
          });
        }
      } catch (error) {
        errors.push({
          email: winnerEmail,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      message: `Processed invoices for ${winners.size} winners`,
      auctionId,
      auctionTitle: auction.title,
      successful: results,
      failed: errors,
      totalWinners: winners.size,
      successCount: results.length,
      failureCount: errors.length
    });

  } catch (error) {
    console.error('Error auto-emailing invoices:', error);
    res.status(500).json({ error: 'Failed to process auction invoices' });
  }
});

// ✅ Mark invoice as paid (Admin only - legacy endpoint)
router.post('/admin/:invoiceId/mark-paid', verifyAdmin, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentDate, notes } = req.body;

    const invoices = readInvoices();
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);

    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[invoiceIndex];
    
    // Update invoice status
    invoices[invoiceIndex] = {
      ...invoice,
      status: 'paid',
      paidAt: paymentDate || new Date().toISOString(),
      paymentNotes: notes || ''
    };

    writeInvoices(invoices);

    // Send payment confirmation email
    try {
      await sendMail({
        to: invoice.userEmail,
        subject: `Payment Confirmed - ${invoice.invoiceNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">✅ Payment Confirmed</h2>
            <p>Your payment for invoice <strong>${invoice.invoiceNumber}</strong> has been confirmed.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Payment Details:</h3>
              <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> R${invoice.total.toLocaleString()}</p>
              <p><strong>Confirmed:</strong> ${new Date().toLocaleDateString()}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>
            
            ${invoice.type === 'buyer' ? `
            <p>Thank you for your payment! We will contact you shortly to arrange collection of your items.</p>
            ` : `
            <p>Your seller payment will be processed within 2-3 business days.</p>
            `}
            
            <p>Best regards,<br><strong>ALL4YOU AUCTIONEERS Team</strong></p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
    }

    res.json({ message: 'Invoice marked as paid successfully' });

  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
});

// ==================== ADMIN PAYMENT MANAGEMENT ENDPOINTS ====================

// 📊 GET: All invoices for admin management
router.get('/admin/all', verifyAdmin, async (req, res) => {
  try {
    // Get all invoices from PostgreSQL
    const invoices = await dbModels.getAllInvoices();
    
    if (invoices.length > 0) {
      // Transform to expected format
      const transformedInvoices = invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        auctionId: inv.auction_id,
        lotId: inv.lot_id,
        buyerEmail: inv.buyer_email,
        sellerEmail: inv.seller_email,
        itemTitle: inv.item_title,
        winningBid: inv.winning_bid,
        buyersPremium: inv.buyers_premium,
        vatAmount: inv.vat_amount,
        totalAmount: inv.total_amount,
        paymentStatus: inv.payment_status,
        paymentMethod: inv.payment_method,
        paymentDate: inv.payment_date,
        paymentReference: inv.payment_reference,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        notes: inv.notes,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at
      }));
      
      // Add summary statistics
      const stats = {
        total: transformedInvoices.length,
        pending: transformedInvoices.filter(i => i.paymentStatus === 'pending').length,
        paid: transformedInvoices.filter(i => i.paymentStatus === 'paid').length,
        overdue: transformedInvoices.filter(i => i.paymentStatus === 'overdue').length
      };
      
      return res.json({ invoices: transformedInvoices, stats });
    }
    
    // Fallback to JSON file
    const jsonInvoices = readInvoices();
    const stats = {
      total: jsonInvoices.length,
      pending: jsonInvoices.filter(i => i.paymentStatus === 'pending').length,
      paid: jsonInvoices.filter(i => i.paymentStatus === 'paid').length,
      overdue: jsonInvoices.filter(i => i.paymentStatus === 'overdue').length
    };
    
    res.json({ invoices: jsonInvoices, stats });
    
  } catch (error) {
    console.error('Error fetching admin invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// 💰 GET: Pending payments (invoices awaiting payment)
router.get('/admin/pending', verifyAdmin, async (req, res) => {
  try {
    const pendingInvoices = await dbModels.getInvoicesByStatus('pending');
    
    const transformedInvoices = pendingInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      buyerEmail: inv.buyer_email,
      itemTitle: inv.item_title,
      totalAmount: inv.total_amount,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      daysOverdue: inv.due_date ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));
    
    res.json({ pendingInvoices: transformedInvoices });
  } catch (error) {
    console.error('Error fetching pending invoices:', error);
    res.status(500).json({ error: 'Failed to fetch pending invoices' });
  }
});

// ✅ POST: Mark invoice as paid manually (after EFT confirmation)
router.post('/admin/:invoiceId/mark-paid', verifyAdmin, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentReference, paymentMethod, paymentDate, notes } = req.body;
    const adminEmail = req.user?.email || 'admin';
    
    // Get invoice details first
    const invoice = await dbModels.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoice.payment_status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already marked as paid' });
    }
    
    // Mark as paid
    const adminData = {
      payment_method: paymentMethod || 'EFT',
      payment_date: paymentDate || new Date().toISOString(),
      payment_reference: paymentReference || '',
      confirmed_by: adminEmail,
      admin_notes: notes || ''
    };
    
    const updatedInvoice = await dbModels.markInvoiceAsPaid(invoiceId, adminData);
    
    if (!updatedInvoice) {
      return res.status(500).json({ error: 'Failed to update invoice payment status' });
    }
    
    // Send payment confirmation email to buyer
    try {
      await sendMail({
        to: invoice.buyer_email,
        subject: `Payment Confirmed - Invoice ${invoice.invoice_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">✅ Payment Confirmed</h2>
            <p>Dear Customer,</p>
            <p>We have confirmed receipt of your payment for the following invoice:</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Payment Details:</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p><strong>Amount Paid:</strong> R${invoice.total_amount}</p>
              <p><strong>Payment Method:</strong> ${adminData.payment_method}</p>
              <p><strong>Payment Reference:</strong> ${adminData.payment_reference}</p>
              <p><strong>Payment Date:</strong> ${new Date(adminData.payment_date).toLocaleDateString()}</p>
            </div>
            
            <p>Your payment has been processed successfully. You can now collect your items or we will arrange delivery as per auction terms.</p>
            
            <p>Thank you for your business!</p>
            <p>Best regards,<br><strong>All4You Auctions Team</strong></p>
          </div>
        `,
        text: `Payment Confirmed - Invoice ${invoice.invoice_number}

Your payment of R${invoice.total_amount} has been confirmed.
Payment Reference: ${adminData.payment_reference}
Payment Date: ${new Date(adminData.payment_date).toLocaleDateString()}

Thank you for your business!
- All4You Auctions Team`
      });
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
      // Don't fail the payment update if email fails
    }
    
    res.json({
      message: 'Invoice marked as paid successfully',
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        buyerEmail: updatedInvoice.buyer_email,
        totalAmount: updatedInvoice.total_amount,
        paymentStatus: updatedInvoice.payment_status,
        paymentMethod: updatedInvoice.payment_method,
        paymentDate: updatedInvoice.payment_date,
        paymentReference: updatedInvoice.payment_reference
      }
    });
    
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

// 📧 GET: Invoice details by ID (for admin review)
router.get('/admin/:invoiceId', verifyAdmin, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await dbModels.getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Transform to expected format
    const invoiceDetails = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      auctionId: invoice.auction_id,
      lotId: invoice.lot_id,
      buyerEmail: invoice.buyer_email,
      sellerEmail: invoice.seller_email,
      itemTitle: invoice.item_title,
      winningBid: invoice.winning_bid,
      buyersPremium: invoice.buyers_premium,
      vatAmount: invoice.vat_amount,
      totalAmount: invoice.total_amount,
      paymentStatus: invoice.payment_status,
      paymentMethod: invoice.payment_method,
      paymentDate: invoice.payment_date,
      paymentReference: invoice.payment_reference,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at
    };
    
    res.json({ invoice: invoiceDetails });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

// 🔍 GET: Search invoices by buyer email
router.get('/admin/search/buyer/:email', verifyAdmin, async (req, res) => {
  try {
    const buyerEmail = decodeURIComponent(req.params.email);
    
    const invoices = await dbModels.getInvoicesByBuyer(buyerEmail);
    
    const transformedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      itemTitle: inv.item_title,
      totalAmount: inv.total_amount,
      paymentStatus: inv.payment_status,
      invoiceDate: inv.invoice_date,
      paymentDate: inv.payment_date
    }));
    
    res.json({ invoices: transformedInvoices, buyerEmail });
  } catch (error) {
    console.error('Error searching invoices by buyer:', error);
    res.status(500).json({ error: 'Failed to search invoices' });
  }
});

module.exports = router;
