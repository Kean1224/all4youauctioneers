const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Company information and branding
const COMPANY_INFO = {
  name: 'ALL4YOU AUCTIONEERS',
  tagline: 'Professional Auction Services',
  address: [
    'Unit 5, Industrial Park',
    'Johannesburg, 2000',
    'South Africa'
  ],
  contact: {
    email: 'admin@all4youauctions.co.za',
    phone: '+27 11 123 4567',
    website: 'www.all4youauctions.co.za'
  },
  vat: 'VAT Reg: 4123456789',
  registration: 'Company Reg: 2024/123456/07'
};

// Banking details
const BANKING_INFO = {
  bankName: 'First National Bank (FNB)',
  accountName: 'ALL4YOU AUCTIONEERS (PTY) LTD',
  accountNumber: '123456789',
  branchCode: '250655',
  branchName: 'Johannesburg Central',
  accountType: 'Business Current Account',
  swiftCode: 'FIRNZAJJ'
};

// Color scheme
const COLORS = {
  primary: '#f59e0b',      // Amber
  secondary: '#374151',     // Gray-700
  success: '#059669',       // Emerald
  muted: '#6b7280',        // Gray-500
  light: '#f3f4f6',        // Gray-100
  border: '#e5e7eb'        // Gray-200
};

class InvoicePDFGenerator {
  constructor() {
    this.doc = null;
    this.currentY = 0;
    this.pageWidth = 545; // A4 width minus margins
    this.margin = 50;
  }

  // Create a new PDF document
  createDocument() {
    this.doc = new PDFDocument({ 
      margin: this.margin, 
      size: 'A4',
      info: {
        Title: 'All4You Auctioneers Invoice',
        Author: 'All4You Auctioneers',
        Subject: 'Auction Invoice',
        Creator: 'All4You Auction System'
      }
    });
    this.currentY = this.margin;
    return this.doc;
  }

  // Add company logo (if available)
  addLogo(logoPath) {
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        this.doc.image(logoPath, this.margin, this.currentY, { 
          width: 80, 
          height: 80 
        });
        return 90; // Return height used
      } catch (error) {
        console.log('Logo not available, using text header');
        return 0;
      }
    }
    return 0;
  }

  // Add company header
  addCompanyHeader(logoPath = null) {
    const logoHeight = this.addLogo(logoPath);
    const headerStartX = logoHeight > 0 ? this.margin + 100 : this.margin;
    
    // Company name
    this.doc.fontSize(24)
       .fillColor(COLORS.primary)
       .text(COMPANY_INFO.name, headerStartX, this.currentY, { 
         align: logoHeight > 0 ? 'left' : 'center' 
       });

    this.currentY += 30;

    // Tagline
    this.doc.fontSize(12)
       .fillColor(COLORS.secondary)
       .text(COMPANY_INFO.tagline, headerStartX, this.currentY, { 
         align: logoHeight > 0 ? 'left' : 'center' 
       });

    this.currentY += 20;

    // Contact information
    this.doc.fontSize(10)
       .fillColor(COLORS.muted)
       .text(`${COMPANY_INFO.contact.email} | ${COMPANY_INFO.contact.phone}`, 
              headerStartX, this.currentY, { 
                align: logoHeight > 0 ? 'left' : 'center' 
              });

    this.currentY += 15;
    this.doc.text(`${COMPANY_INFO.contact.website} | ${COMPANY_INFO.vat}`, 
                  headerStartX, this.currentY, { 
                    align: logoHeight > 0 ? 'left' : 'center' 
                  });

    this.currentY = Math.max(this.currentY + 25, this.margin + logoHeight + 10);

    // Header separator line
    this.doc.strokeColor(COLORS.border)
       .lineWidth(1)
       .moveTo(this.margin, this.currentY)
       .lineTo(this.margin + this.pageWidth, this.currentY)
       .stroke();

    this.currentY += 20;
  }

  // Add invoice title and basic info
  addInvoiceHeader(invoiceData) {
    // Invoice title
    this.doc.fontSize(28)
       .fillColor(COLORS.secondary)
       .text(`${invoiceData.type.toUpperCase()} INVOICE`, this.margin, this.currentY, { 
         align: 'center' 
       });

    this.currentY += 50;

    // Two-column layout for invoice details
    const leftCol = this.margin;
    const rightCol = this.margin + 280;

    // Left column - Invoice details
    this.doc.fontSize(14)
       .fillColor(COLORS.secondary)
       .text('Invoice Details', leftCol, this.currentY);

    this.currentY += 20;

    this.doc.fontSize(11)
       .fillColor(COLORS.muted)
       .text(`Invoice Number:`, leftCol, this.currentY)
       .fillColor('#000000')
       .text(invoiceData.invoiceNumber, leftCol + 100, this.currentY);

    this.currentY += 18;
    this.doc.fillColor(COLORS.muted)
       .text(`Invoice Date:`, leftCol, this.currentY)
       .fillColor('#000000')
       .text(new Date(invoiceData.createdAt).toLocaleDateString('en-ZA'), leftCol + 100, this.currentY);

    this.currentY += 18;
    this.doc.fillColor(COLORS.muted)
       .text(`Due Date:`, leftCol, this.currentY)
       .fillColor(invoiceData.status === 'overdue' ? '#dc2626' : '#000000')
       .text(new Date(invoiceData.dueDate).toLocaleDateString('en-ZA'), leftCol + 100, this.currentY);

    // Right column - Customer details
    const customerY = this.currentY - 56;
    this.doc.fontSize(14)
       .fillColor(COLORS.secondary)
       .text(invoiceData.type === 'buyer' ? 'Bill To' : 'Pay To', rightCol, customerY);

    this.doc.fontSize(11)
       .fillColor('#000000')
       .text(invoiceData.userEmail, rightCol, customerY + 20);

    this.doc.fillColor(COLORS.muted)
       .text(`Auction: ${invoiceData.auctionTitle}`, rightCol, customerY + 38);

    // Status badge
    this.currentY += 25;
    const statusColor = invoiceData.status === 'paid' ? COLORS.success : 
                       invoiceData.status === 'overdue' ? '#dc2626' : COLORS.primary;
    
    this.doc.rect(rightCol, this.currentY - 5, 80, 20)
       .fillColor(statusColor)
       .fill();

    this.doc.fontSize(10)
       .fillColor('#ffffff')
       .text(invoiceData.status.toUpperCase(), rightCol + 5, this.currentY, { 
         width: 70, 
         align: 'center' 
       });

    this.currentY += 40;
  }

  // Add items table
  addItemsTable(items, invoiceType) {
    // Table header
    const tableHeaderY = this.currentY;
    this.doc.rect(this.margin, tableHeaderY, this.pageWidth, 30)
       .fillColor(COLORS.light)
       .fill();

    this.doc.fillColor(COLORS.secondary)
       .fontSize(11)
       .text('Lot #', this.margin + 10, tableHeaderY + 10)
       .text('Description', this.margin + 80, tableHeaderY + 10)
       .text('Winning Bid', this.margin + 280, tableHeaderY + 10)
       .text('Commission', this.margin + 370, tableHeaderY + 10);

    if (invoiceType === 'seller') {
      this.doc.text('You Receive', this.margin + 450, tableHeaderY + 10);
    }

    this.currentY += 30;

    // Table rows
    items.forEach((item, index) => {
      const rowY = this.currentY;
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      
      this.doc.rect(this.margin, rowY, this.pageWidth, 25)
         .fillColor(rowColor)
         .fill();

      this.doc.fillColor('#000000')
         .fontSize(10)
         .text(item.lotNumber || item.lotId, this.margin + 10, rowY + 8)
         .text(this.truncateText(item.title, 25), this.margin + 80, rowY + 8)
         .text(`R${item.winningBid.toLocaleString()}`, this.margin + 280, rowY + 8)
         .text(`R${item.commission.toLocaleString()}`, this.margin + 370, rowY + 8);

      if (invoiceType === 'seller' && item.sellerReceives) {
        this.doc.text(`R${item.sellerReceives.toLocaleString()}`, this.margin + 450, rowY + 8);
      }

      this.currentY += 25;
    });

    // Table border
    this.doc.rect(this.margin, tableHeaderY, this.pageWidth, this.currentY - tableHeaderY)
       .strokeColor(COLORS.border)
       .stroke();

    this.currentY += 20;
  }

  // Add totals section
  addTotalsSection(invoiceData) {
    const totalsBoxX = this.margin + 300;
    const totalsBoxY = this.currentY;
    const boxWidth = 245;
    const boxHeight = 120;

    // Totals box
    this.doc.rect(totalsBoxX, totalsBoxY, boxWidth, boxHeight)
       .strokeColor(COLORS.border)
       .stroke();

    // Totals content
    let yPos = totalsBoxY + 15;
    
    this.doc.fontSize(12)
       .fillColor(COLORS.muted)
       .text('Subtotal:', totalsBoxX + 15, yPos)
       .fillColor('#000000')
       .text(`R${invoiceData.subtotal.toLocaleString()}`, totalsBoxX + 150, yPos, { align: 'right', width: 80 });

    yPos += 20;
    if (invoiceData.vat > 0) {
      this.doc.fillColor(COLORS.muted)
         .text('VAT (15%):', totalsBoxX + 15, yPos)
         .fillColor('#000000')
         .text(`R${invoiceData.vat.toLocaleString()}`, totalsBoxX + 150, yPos, { align: 'right', width: 80 });
      yPos += 20;
    }

    // Discount if applicable
    if (invoiceData.discount && invoiceData.discount > 0) {
      this.doc.fillColor('#dc2626')
         .text('Discount:', totalsBoxX + 15, yPos)
         .text(`-R${invoiceData.discount.toLocaleString()}`, totalsBoxX + 150, yPos, { align: 'right', width: 80 });
      yPos += 20;
    }

    // Total line
    this.doc.strokeColor(COLORS.border)
       .lineWidth(1)
       .moveTo(totalsBoxX + 15, yPos)
       .lineTo(totalsBoxX + boxWidth - 15, yPos)
       .stroke();

    yPos += 15;
    this.doc.fontSize(14)
       .fillColor(COLORS.success)
       .text('TOTAL:', totalsBoxX + 15, yPos)
       .text(`R${invoiceData.total.toLocaleString()}`, totalsBoxX + 150, yPos, { align: 'right', width: 80 });

    this.currentY = totalsBoxY + boxHeight + 30;
  }

  // Add banking and payment information
  addBankingInformation(invoiceData) {
    // Payment instructions header
    this.doc.fontSize(16)
       .fillColor(COLORS.secondary)
       .text('Payment Information', this.margin, this.currentY);

    this.currentY += 25;

    // Banking details box
    const bankingBoxY = this.currentY;
    this.doc.rect(this.margin, bankingBoxY, this.pageWidth, 140)
       .fillColor('#fefce8')
       .fill()
       .strokeColor('#d97706')
       .stroke();

    // Banking details content
    this.doc.fontSize(12)
       .fillColor(COLORS.secondary)
       .text('Bank Transfer Details:', this.margin + 15, bankingBoxY + 15);

    let bankingY = bankingBoxY + 35;
    this.doc.fontSize(10)
       .fillColor('#000000')
       .text(`Bank Name: ${BANKING_INFO.bankName}`, this.margin + 15, bankingY)
       .text(`Account Name: ${BANKING_INFO.accountName}`, this.margin + 15, bankingY + 15)
       .text(`Account Number: ${BANKING_INFO.accountNumber}`, this.margin + 15, bankingY + 30)
       .text(`Branch Code: ${BANKING_INFO.branchCode} (${BANKING_INFO.branchName})`, this.margin + 15, bankingY + 45)
       .text(`Account Type: ${BANKING_INFO.accountType}`, this.margin + 15, bankingY + 60)
       .text(`Reference: ${invoiceData.invoiceNumber}`, this.margin + 15, bankingY + 75);

    // Payment instructions
    this.doc.fontSize(11)
       .fillColor('#a16207')
       .text(`⚠️ IMPORTANT: Use "${invoiceData.invoiceNumber}" as payment reference`, this.margin + 15, bankingY + 95);

    this.currentY = bankingBoxY + 160;

    // Payment terms
    this.doc.fontSize(12)
       .fillColor(COLORS.secondary)
       .text('Payment Terms:', this.margin, this.currentY);

    this.currentY += 20;
    const terms = [
      `• Payment is due within ${invoiceData.type === 'buyer' ? '7' : '14'} days of invoice date`,
      '• Email proof of payment to admin@all4youauctions.co.za',
      '• Include invoice number in payment reference',
      invoiceData.type === 'buyer' ? 
        '• Items will be held for collection upon payment confirmation' :
        '• Seller payment processed after buyer payment and item collection',
      '• Late payments may incur additional charges',
      '• Questions? Contact us at +27 11 123 4567'
    ];

    this.doc.fontSize(10)
       .fillColor(COLORS.muted);

    terms.forEach(term => {
      this.doc.text(term, this.margin, this.currentY);
      this.currentY += 15;
    });

    this.currentY += 10;
  }

  // Add footer
  addFooter() {
    const footerY = 750; // Fixed position at bottom
    
    // Footer separator
    this.doc.strokeColor(COLORS.border)
       .lineWidth(1)
       .moveTo(this.margin, footerY)
       .lineTo(this.margin + this.pageWidth, footerY)
       .stroke();

    // Footer content
    this.doc.fontSize(8)
       .fillColor(COLORS.muted)
       .text('This is a computer-generated invoice and does not require a signature.', 
             this.margin, footerY + 10, { align: 'center' });

    this.doc.text(`${COMPANY_INFO.name} | ${COMPANY_INFO.registration}`, 
                  this.margin, footerY + 25, { align: 'center' });

    this.doc.text(`Generated on ${new Date().toLocaleString('en-ZA')}`, 
                  this.margin, footerY + 40, { align: 'center' });
  }

  // Utility function to truncate text
  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Generate complete invoice PDF
  async generateInvoice(invoiceData, outputPath, logoPath = null) {
    return new Promise((resolve, reject) => {
      try {
        this.createDocument();
        
        // Create write stream
        const stream = fs.createWriteStream(outputPath);
        this.doc.pipe(stream);

        // Add all sections
        this.addCompanyHeader(logoPath);
        this.addInvoiceHeader(invoiceData);
        this.addItemsTable(invoiceData.items, invoiceData.type);
        this.addTotalsSection(invoiceData);
        this.addBankingInformation(invoiceData);
        this.addFooter();

        // Finalize PDF
        this.doc.end();

        stream.on('finish', () => {
          resolve({
            fileName: path.basename(outputPath),
            filePath: outputPath,
            size: fs.statSync(outputPath).size
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = { InvoicePDFGenerator, COMPANY_INFO, BANKING_INFO };