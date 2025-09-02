// Complete Auction Management System
const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import database models - PostgreSQL only
const dbModels = require('../../database/models');

// POST: Complete auction and generate all invoices
router.post('/complete-auction/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    console.log('🏁 Completing auction:', auctionId);
    
    // Check if auction exists in database
    const auction = await dbModels.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Generate consolidated invoices using new database system
    const invoiceResults = await dbModels.generateAuctionInvoices(auctionId);
    
    if (invoiceResults.buyerInvoices.length === 0 && invoiceResults.sellerInvoices.length === 0) {
      return res.status(400).json({ error: 'No sold lots found for this auction' });
    }

    // Update auction status to completed (future enhancement - add this field to auctions table)
    console.log(`✅ Auction ${auctionId} completed with ${invoiceResults.buyerInvoices.length} buyer invoices and ${invoiceResults.sellerInvoices.length} seller invoices`);

    // Send email notifications (optional - implement later)
    // await sendInvoiceNotifications(invoiceResults, auction);

    res.json({
      message: 'Auction completed successfully',
      auctionId: auction.id,
      buyerInvoicesGenerated: invoiceResults.buyerInvoices.length,
      sellerInvoicesGenerated: invoiceResults.sellerInvoices.length,
      totalInvoicesGenerated: invoiceResults.buyerInvoices.length + invoiceResults.sellerInvoices.length,
      results: invoiceResults
    });

  } catch (error) {
    console.error('Error completing auction:', error);
    res.status(500).json({ error: 'Failed to complete auction', details: error.message });
  }
});

// POST: Generate invoices for auction (can be called multiple times)
router.post('/generate-invoices/:auctionId', async (req, res) => {
  try {
    const { auctionId } = req.params;
    console.log('📋 Generating invoices for auction:', auctionId);
    
    // Generate consolidated invoices
    const invoiceResults = await dbModels.generateAuctionInvoices(auctionId);
    
    res.json({
      message: 'Invoices generated successfully',
      auctionId: auctionId,
      buyerInvoicesGenerated: invoiceResults.buyerInvoices.length,
      sellerInvoicesGenerated: invoiceResults.sellerInvoices.length,
      totalInvoicesGenerated: invoiceResults.buyerInvoices.length + invoiceResults.sellerInvoices.length,
      results: invoiceResults
    });

  } catch (error) {
    console.error('Error generating invoices:', error);
    res.status(500).json({ error: 'Failed to generate invoices', details: error.message });
  }
});

// GET: Generate buyer invoice PDF for specific auction
router.get('/invoice/buyer/:email/auction/:auctionId/pdf', (req, res) => {
  try {
    const { email, auctionId } = req.params;
    
    const invoices = readJSON(invoicesPath);
    const buyerInvoices = invoices.filter(inv => 
      inv.buyerEmail === email && inv.auctionId === auctionId
    );

    if (buyerInvoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for this buyer in this auction' });
    }

    const auction = buyerInvoices[0]; // Get auction info from first invoice
    
    // Set PDF headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 
      `attachment; filename="buyer-invoice-${auction.auctionTitle.replace(/[^a-zA-Z0-9]/g, '_')}-${email.replace('@', '_at_')}.pdf"`
    );

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('BUYER INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Company info
    doc.fontSize(14).text('All4You Auctions', { align: 'center' });
    doc.fontSize(10).text('www.all4youauctions.com', { align: 'center' });
    doc.moveDown(2);

    // Invoice details
    doc.fontSize(12);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Auction: ${auction.auctionTitle}`);
    doc.text(`Buyer: ${email}`);
    doc.moveDown();

    // Table header
    doc.text('LOTS WON:', { underline: true });
    doc.moveDown();

    let totalAmount = 0;
    let totalPremium = 0;

    // Invoice items
    buyerInvoices.forEach((invoice, index) => {
      doc.text(`${index + 1}. Lot ${invoice.lotNumber}: ${invoice.item}`);
      doc.text(`   Winning Bid: R${invoice.winningBid.toFixed(2)}`);
      doc.text(`   Buyer Premium (10%): R${invoice.buyerPremium.toFixed(2)}`);
      doc.text(`   Total Amount: R${invoice.buyerTotal.toFixed(2)}`, { align: 'right' });
      doc.moveDown();
      
      totalAmount += invoice.buyerTotal;
      totalPremium += invoice.buyerPremium;
    });

    // Summary
    doc.moveDown();
    doc.fontSize(14).text('SUMMARY:', { underline: true });
    doc.fontSize(12);
    doc.text(`Subtotal: R${(totalAmount - totalPremium).toFixed(2)}`);
    doc.text(`Buyer Premium (10%): R${totalPremium.toFixed(2)}`);
    doc.fontSize(14).text(`TOTAL DUE: R${totalAmount.toFixed(2)}`, { align: 'right' });
    
    doc.moveDown(2);
    doc.fontSize(10);
    doc.text('Payment Terms: Payment due within 7 days of invoice date.');
    doc.text('Banking Details: [Your banking details here]');
    doc.text('Reference: Use your email address as payment reference.');

    doc.end();

  } catch (error) {
    console.error('Error generating buyer PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET: Generate seller invoice PDF for specific auction
router.get('/invoice/seller/:email/auction/:auctionId/pdf', (req, res) => {
  try {
    const { email, auctionId } = req.params;
    
    const invoices = readJSON(invoicesPath);
    const sellerInvoices = invoices.filter(inv => 
      inv.sellerEmail === email && inv.auctionId === auctionId
    );

    if (sellerInvoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found for this seller in this auction' });
    }

    const auction = sellerInvoices[0];
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 
      `attachment; filename="seller-statement-${auction.auctionTitle.replace(/[^a-zA-Z0-9]/g, '_')}-${email.replace('@', '_at_')}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('SELLER STATEMENT', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).text('All4You Auctions', { align: 'center' });
    doc.fontSize(10).text('www.all4youauctions.com', { align: 'center' });
    doc.moveDown(2);

    // Statement details
    doc.fontSize(12);
    doc.text(`Statement Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Auction: ${auction.auctionTitle}`);
    doc.text(`Seller: ${email}`);
    doc.moveDown();

    doc.text('LOTS SOLD:', { underline: true });
    doc.moveDown();

    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    sellerInvoices.forEach((invoice, index) => {
      doc.text(`${index + 1}. Lot ${invoice.lotNumber}: ${invoice.item}`);
      doc.text(`   Sold to: ${invoice.buyerEmail}`);
      doc.text(`   Sale Price: R${invoice.winningBid.toFixed(2)}`);
      doc.text(`   Commission (15%): R${invoice.sellerCommission.toFixed(2)}`);
      doc.text(`   Net Amount: R${invoice.sellerNet.toFixed(2)}`, { align: 'right' });
      doc.moveDown();
      
      totalGross += invoice.winningBid;
      totalCommission += invoice.sellerCommission;
      totalNet += invoice.sellerNet;
    });

    // Summary
    doc.moveDown();
    doc.fontSize(14).text('SUMMARY:', { underline: true });
    doc.fontSize(12);
    doc.text(`Gross Sales: R${totalGross.toFixed(2)}`);
    doc.text(`Commission (15%): R${totalCommission.toFixed(2)}`);
    doc.fontSize(14).text(`NET AMOUNT DUE: R${totalNet.toFixed(2)}`, { align: 'right' });
    
    doc.moveDown(2);
    doc.fontSize(10);
    doc.text('Payment Terms: Net amount will be paid within 14 days after buyer payment received.');
    doc.text('Note: Seller payment is contingent on buyer payment being received in full.');

    doc.end();

  } catch (error) {
    console.error('Error generating seller PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Email notification function
async function sendInvoiceNotifications(invoices, auction) {
  try {
    const { sendMail } = require('../../utils/mailer');
    
    // Group invoices by buyer and seller
    const buyerGroups = {};
    const sellerGroups = {};
    
    invoices.forEach(invoice => {
      // Group by buyer
      if (!buyerGroups[invoice.buyerEmail]) {
        buyerGroups[invoice.buyerEmail] = [];
      }
      buyerGroups[invoice.buyerEmail].push(invoice);
      
      // Group by seller
      if (!sellerGroups[invoice.sellerEmail]) {
        sellerGroups[invoice.sellerEmail] = [];
      }
      sellerGroups[invoice.sellerEmail].push(invoice);
    });

    // Send buyer notifications
    for (const [email, buyerInvoices] of Object.entries(buyerGroups)) {
      const totalAmount = buyerInvoices.reduce((sum, inv) => sum + inv.buyerTotal, 0);
      
      await sendMail({
        to: email,
        subject: `Invoice: ${auction.title} - Payment Required`,
        html: `
          <h2>Congratulations on your winning bids!</h2>
          <p>Dear Bidder,</p>
          <p>The auction "${auction.title}" has concluded. You have won ${buyerInvoices.length} lot(s).</p>
          <p><strong>Total Amount Due: R${totalAmount.toFixed(2)}</strong></p>
          <p>Please log in to download your detailed invoice and make payment within 7 days.</p>
          <p>Thank you for participating!</p>
          <p>All4You Auctions Team</p>
        `
      });
    }

    // Send seller notifications
    for (const [email, sellerInvoices] of Object.entries(sellerGroups)) {
      const totalNet = sellerInvoices.reduce((sum, inv) => sum + inv.sellerNet, 0);
      
      await sendMail({
        to: email,
        subject: `Sales Statement: ${auction.title} - Lots Sold`,
        html: `
          <h2>Your lots have been sold!</h2>
          <p>Dear Seller,</p>
          <p>Great news! ${sellerInvoices.length} of your lots sold in "${auction.title}".</p>
          <p><strong>Net Amount Due to You: R${totalNet.toFixed(2)}</strong></p>
          <p>Payment will be processed within 14 days after buyer payments are received.</p>
          <p>Please log in to download your detailed statement.</p>
          <p>Thank you for choosing All4You Auctions!</p>
          <p>All4You Auctions Team</p>
        `
      });
    }

  } catch (error) {
    console.error('Error sending invoice notifications:', error);
  }
}

// GET: Get auction completion status
router.get('/auction/:auctionId/completion-status', (req, res) => {
  try {
    const { auctionId } = req.params;
    
    const auctions = readJSON(auctionsPath);
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const allLots = readJSON(lotsPath);
    const auctionLots = allLots.filter(lot => lot.auctionId === auctionId);
    const soldLots = auctionLots.filter(lot => lot.bidHistory && lot.bidHistory.length > 0);
    
    const invoices = readJSON(invoicesPath);
    const auctionInvoices = invoices.filter(inv => inv.auctionId === auctionId);

    res.json({
      auction: {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        endTime: auction.endTime,
        completedAt: auction.completedAt
      },
      stats: {
        totalLots: auctionLots.length,
        soldLots: soldLots.length,
        unsoldLots: auctionLots.length - soldLots.length,
        invoicesGenerated: auctionInvoices.length,
        totalRevenue: auctionInvoices.reduce((sum, inv) => sum + inv.winningBid, 0)
      },
      readyForCompletion: soldLots.length > 0 && auction.status !== 'completed'
    });

  } catch (error) {
    console.error('Error getting completion status:', error);
    res.status(500).json({ error: 'Failed to get completion status' });
  }
});

module.exports = router;
