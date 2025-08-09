const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const authenticateToken = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');

const router = express.Router();

// Invoice storage paths
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

// Generate comprehensive PDF invoice
const generateInvoicePDF = (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const fileName = `invoice_${invoiceData.invoiceNumber}.pdf`;
      const filePath = path.join(INVOICES_DIR, fileName);
      
      doc.pipe(fs.createWriteStream(filePath));

      // Company Header
      doc.fontSize(20)
         .fillColor('#f59e0b')
         .text('ALL4YOU AUCTIONEERS', 50, 50, { align: 'center' })
         .fontSize(12)
         .fillColor('#000000')
         .text('Professional Auction Services', 50, 80, { align: 'center' })
         .text('admin@all4youauctions.co.za | www.all4youauctions.co.za', 50, 95, { align: 'center' });

      // Invoice Title
      doc.fontSize(24)
         .fillColor('#374151')
         .text(`${invoiceData.type.toUpperCase()} INVOICE`, 50, 130, { align: 'center' });

      // Invoice Details Box
      const boxY = 170;
      doc.rect(50, boxY, 495, 100)
         .strokeColor('#e5e7eb')
         .stroke();

      doc.fontSize(12)
         .fillColor('#000000')
         .text(`Invoice Number: ${invoiceData.invoiceNumber}`, 60, boxY + 15)
         .text(`Date: ${new Date(invoiceData.createdAt).toLocaleDateString()}`, 60, boxY + 35)
         .text(`Auction: ${invoiceData.auctionTitle}`, 60, boxY + 55)
         .text(`Status: ${invoiceData.status.toUpperCase()}`, 60, boxY + 75);

      doc.text(`${invoiceData.type === 'buyer' ? 'Buyer' : 'Seller'}: ${invoiceData.userEmail}`, 300, boxY + 15)
         .text(`Payment Due: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 300, boxY + 35);

      // Items Table Header
      const tableY = 300;
      doc.rect(50, tableY, 495, 25)
         .fillColor('#f3f4f6')
         .fill();

      doc.fillColor('#000000')
         .fontSize(12)
         .text('Lot', 60, tableY + 8)
         .text('Description', 150, tableY + 8)
         .text('Winning Bid', 350, tableY + 8)
         .text('Commission', 430, tableY + 8);

      // Items
      let currentY = tableY + 25;
      invoiceData.items.forEach((item, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(50, currentY, 495, 25)
           .fillColor(rowColor)
           .fill();

        doc.fillColor('#000000')
           .fontSize(10)
           .text(item.lotNumber || item.lotId, 60, currentY + 8)
           .text(item.title.substring(0, 25) + (item.title.length > 25 ? '...' : ''), 150, currentY + 8)
           .text(`R${item.winningBid.toLocaleString()}`, 350, currentY + 8)
           .text(`R${item.commission.toLocaleString()}`, 430, currentY + 8);

        currentY += 25;
      });

      // Totals Section
      const totalsY = currentY + 20;
      doc.rect(350, totalsY, 195, 80)
         .strokeColor('#e5e7eb')
         .stroke();

      doc.fontSize(12)
         .text(`Subtotal: R${invoiceData.subtotal.toLocaleString()}`, 360, totalsY + 10)
         .text(`VAT (15%): R${invoiceData.vat.toLocaleString()}`, 360, totalsY + 30)
         .fontSize(14)
         .fillColor('#059669')
         .text(`Total: R${invoiceData.total.toLocaleString()}`, 360, totalsY + 55);

      // Payment Terms
      doc.fontSize(12)
         .fillColor('#374151')
         .text('Payment Terms & Instructions:', 50, totalsY + 100)
         .fontSize(10)
         .fillColor('#6b7280')
         .text('• Payment is due within 7 days of invoice date', 50, totalsY + 120)
         .text('• Bank: FNB | Account: 123456789 | Branch: 250655', 50, totalsY + 135)
         .text(`• Reference: ${invoiceData.invoiceNumber}`, 50, totalsY + 150)
         .text('• Email proof of payment to admin@all4youauctions.co.za', 50, totalsY + 165);

      if (invoiceData.type === 'buyer') {
        doc.text('• Collection arrangements will be made upon payment confirmation', 50, totalsY + 180);
      } else {
        doc.text('• Seller payment will be processed after buyer payment and collection', 50, totalsY + 180);
      }

      // Footer
      doc.fontSize(8)
         .fillColor('#9ca3af')
         .text('This is a computer-generated invoice and does not require a signature.', 50, totalsY + 220, { align: 'center' })
         .text('ALL4YOU AUCTIONEERS - Professional Auction Services', 50, totalsY + 235, { align: 'center' });

      doc.end();

      doc.on('end', () => {
        resolve({ fileName, filePath });
      });

    } catch (error) {
      reject(error);
    }
  });
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

    // Check if invoice already exists
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

    // Calculate totals
    const items = wonLots.map(lot => {
      const commission = lot.currentBid * 0.15; // 15% buyer's premium
      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber || lot.id,
        title: lot.title,
        winningBid: lot.currentBid,
        commission: commission
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.winningBid + item.commission, 0);
    const vat = subtotal * 0.15; // 15% VAT
    const total = subtotal + vat;

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
      subtotal,
      vat,
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
      const commission = lot.currentBid * 0.10; // 10% seller's commission
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

// 📊 Get user's invoices
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

// ✅ Mark invoice as paid (Admin only)
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

module.exports = router;
