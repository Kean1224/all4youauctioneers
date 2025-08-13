const express = require('express');
const path = require('path');
const fs = require('fs');
const { InvoicePDFGenerator } = require('../../utils/invoicePDFGenerator');
const verifyAdmin = require('../auth/verify-admin');

const router = express.Router();

// 🧪 Test PDF generation with sample data
router.post('/generate-sample', verifyAdmin, async (req, res) => {
  try {
    console.log('🧪 Generating sample invoice PDF...');
    
    // Sample invoice data
    const sampleInvoiceData = {
      invoiceNumber: 'TEST-001-' + Date.now(),
      type: 'buyer',
      auctionId: 'sample-auction-001',
      auctionTitle: 'Monthly Antique & Collectibles Auction',
      userEmail: 'testbuyer@example.com',
      items: [
        {
          lotId: 'LOT001',
          lotNumber: '001',
          title: 'Vintage Oak Dining Table with 6 Chairs',
          winningBid: 15000,
          commission: 2250
        },
        {
          lotId: 'LOT002', 
          lotNumber: '002',
          title: 'Antique Chinese Porcelain Vase Set',
          winningBid: 8500,
          commission: 1275
        },
        {
          lotId: 'LOT003',
          lotNumber: '003', 
          title: 'Art Deco Mirror with Silver Frame',
          winningBid: 3200,
          commission: 480
        }
      ],
      subtotal: 30005, // 26700 (total bids) + 4005 (total commission)
      vat: 4500.75,    // 15% VAT
      total: 34505.75,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Generate PDF
    const invoicesDir = path.join(__dirname, '../../uploads/invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const fileName = `sample_invoice_${sampleInvoiceData.invoiceNumber}.pdf`;
    const filePath = path.join(invoicesDir, fileName);
    
    // Check for logo
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    const logoExists = fs.existsSync(logoPath) ? logoPath : null;
    
    const pdfGenerator = new InvoicePDFGenerator();
    const result = await pdfGenerator.generateInvoice(sampleInvoiceData, filePath, logoExists);

    res.json({
      success: true,
      message: 'Sample invoice PDF generated successfully',
      invoice: {
        invoiceNumber: sampleInvoiceData.invoiceNumber,
        type: sampleInvoiceData.type,
        total: sampleInvoiceData.total,
        itemCount: sampleInvoiceData.items.length
      },
      pdf: {
        fileName: result.fileName,
        size: `${(result.size / 1024).toFixed(1)}KB`,
        downloadUrl: `/api/invoices/test-pdf/download/${sampleInvoiceData.invoiceNumber}`
      },
      logoUsed: !!logoExists,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating sample PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate sample invoice',
      details: error.message 
    });
  }
});

// 📥 Download sample PDF
router.get('/download/:invoiceNumber', async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const fileName = `sample_invoice_${invoiceNumber}.pdf`;
    const filePath = path.join(__dirname, '../../uploads/invoices', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Sample invoice PDF not found' });
    }

    res.download(filePath, fileName);

  } catch (error) {
    console.error('Error downloading sample PDF:', error);
    res.status(500).json({ error: 'Failed to download sample PDF' });
  }
});

// 🧪 Generate seller invoice sample
router.post('/generate-seller-sample', verifyAdmin, async (req, res) => {
  try {
    console.log('🧪 Generating sample seller invoice PDF...');
    
    // Sample seller invoice data
    const sampleSellerData = {
      invoiceNumber: 'SELL-TEST-' + Date.now(),
      type: 'seller',
      auctionId: 'sample-auction-001',
      auctionTitle: 'Monthly Antique & Collectibles Auction',
      userEmail: 'testseller@example.com',
      items: [
        {
          lotId: 'LOT001',
          lotNumber: '001',
          title: 'Vintage Oak Dining Table with 6 Chairs',
          winningBid: 15000,
          commission: 1500,
          sellerReceives: 13500
        },
        {
          lotId: 'LOT004',
          lotNumber: '004',
          title: 'Persian Rug - Hand Woven',
          winningBid: 12000,
          commission: 1200,
          sellerReceives: 10800
        }
      ],
      subtotal: 24300, // Total seller receives
      vat: 0,          // No VAT on seller payouts
      total: 24300,
      status: 'pending',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Generate PDF
    const invoicesDir = path.join(__dirname, '../../uploads/invoices');
    const fileName = `sample_seller_${sampleSellerData.invoiceNumber}.pdf`;
    const filePath = path.join(invoicesDir, fileName);
    
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    const logoExists = fs.existsSync(logoPath) ? logoPath : null;
    
    const pdfGenerator = new InvoicePDFGenerator();
    const result = await pdfGenerator.generateInvoice(sampleSellerData, filePath, logoExists);

    res.json({
      success: true,
      message: 'Sample seller invoice PDF generated successfully',
      invoice: {
        invoiceNumber: sampleSellerData.invoiceNumber,
        type: sampleSellerData.type,
        total: sampleSellerData.total,
        itemCount: sampleSellerData.items.length
      },
      pdf: {
        fileName: result.fileName,
        size: `${(result.size / 1024).toFixed(1)}KB`,
        downloadUrl: `/api/invoices/test-pdf/download/${sampleSellerData.invoiceNumber}`
      },
      logoUsed: !!logoExists,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating sample seller PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate sample seller invoice',
      details: error.message 
    });
  }
});

module.exports = router;