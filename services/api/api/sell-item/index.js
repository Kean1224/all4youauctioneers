
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');

const router = express.Router();

// File paths
const SELL_ITEMS_FILE = path.join(__dirname, '../../data/sell_items.json');
const SELL_UPLOADS_DIR = path.join(__dirname, '../../uploads/sell');

// Ensure upload directory exists
if (!fs.existsSync(SELL_UPLOADS_DIR)) {
  fs.mkdirSync(SELL_UPLOADS_DIR, { recursive: true });
}

// Configure multer for item image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SELL_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper functions
const readSellItems = () => {
  try {
    if (fs.existsSync(SELL_ITEMS_FILE)) {
      const data = fs.readFileSync(SELL_ITEMS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading sell items file:', error);
    return [];
  }
};

const writeSellItems = (items) => {
  try {
    fs.writeFileSync(SELL_ITEMS_FILE, JSON.stringify(items, null, 2));
  } catch (error) {
    console.error('Error writing sell items file:', error);
  }
};

// Email notification imports
let sendMail = null;
try {
  const mailerModule = require('../../utils/mailer');
  sendMail = mailerModule.sendMail;
} catch (e) {
  console.log('⚠️  Email service not available for sell items');
  sendMail = async () => Promise.resolve();
}

// 📝 Submit item for sale (with image uploads)
// Accept any image field name (upload.any())
router.post('/submit', upload.any(), authenticateToken, async (req, res) => {
  try {
    const {
      itemTitle,
      itemDescription,
      category,
      condition,
      askingPrice,
      location,
      dimensions,
      notes
    } = req.body;

    // Validation
    if (!itemTitle || !itemDescription || !category || !askingPrice) {
      return res.status(400).json({ 
        error: 'Missing required fields: itemTitle, itemDescription, category, askingPrice' 
      });
    }

    const userEmail = req.user.email;

    // Process uploaded images
    const uploadedImages = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      path: file.path
    })) : [];

    const sellItems = readSellItems();
    
    const newItem = {
      id: uuidv4(),
      submittedBy: userEmail,
      itemTitle: itemTitle.trim(),
      itemDescription: itemDescription.trim(),
      category: category.trim(),
      condition: condition || 'Good',
      askingPrice: parseFloat(askingPrice) || 0,
      location: location || '',
      dimensions: dimensions ? JSON.parse(dimensions) : { length: '', width: '', height: '' },
      notes: notes ? notes.trim() : '',
      images: uploadedImages,
      status: 'pending', // pending, approved, rejected, countered, accepted, sold
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      adminNotes: '',
      adminOffer: null, // for counter-offer
      finalSalePrice: null
    };

    sellItems.push(newItem);
    writeSellItems(sellItems);

    // Send confirmation email to user
    try {
      await sendMail({
        to: userEmail,
        subject: `Offer Submitted - ${itemTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">📦 Offer Submitted</h2>
            <p>Thank you for submitting your offer to sell your item directly to the admin!</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Item Details:</h3>
              <p><strong>Title:</strong> ${itemTitle}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Condition:</strong> ${condition}</p>
              <p><strong>Your Asking Price:</strong> R${askingPrice}</p>
              <p><strong>Images Uploaded:</strong> ${uploadedImages.length}</p>
              <p><strong>Submission ID:</strong> ${newItem.id}</p>
            </div>
            <div style="background: #fefce8; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #a16207;">Next Steps:</h4>
              <p style="color: #a16207;">
                • The admin will review your offer within 2-3 business days<br>
                • You will receive an email if your offer is accepted or if a counter-offer is made<br>
                • If accepted, you will be contacted to arrange the sale
              </p>
            </div>
            <p>You can track your offer status in your dashboard.</p>
            <p>Best regards,<br><strong>ALL4YOU AUCTIONEERS Team</strong></p>
          </div>
        `,
        text: `
Offer Submitted - ${itemTitle}

Thank you for submitting your offer to sell your item directly to the admin!

Item: ${itemTitle}
Category: ${category}
Condition: ${condition}
Your Asking Price: R${askingPrice}
Images: ${uploadedImages.length}
ID: ${newItem.id}

The admin will review your offer within 2-3 business days.

- ALL4YOU AUCTIONEERS Team
        `
      });
    } catch (emailError) {
      console.error('Failed to send offer submission email:', emailError);
    }

    // Send notification to admin
    try {
      await sendMail({
        to: 'admin@all4youauctions.co.za',
        subject: `New Direct Sale Offer - ${itemTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🔔 New Direct Sale Offer</h2>
            <p>A new direct sale offer has been submitted.</p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Item Details:</h3>
              <p><strong>Submitted by:</strong> ${userEmail}</p>
              <p><strong>Title:</strong> ${itemTitle}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Condition:</strong> ${condition}</p>
              <p><strong>Asking Price:</strong> R${askingPrice}</p>
              <p><strong>Images:</strong> ${uploadedImages.length}</p>
              <p><strong>ID:</strong> ${newItem.id}</p>
            </div>
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4>Description:</h4>
              <p>${itemDescription}</p>
              ${notes ? `<h4>Additional Notes:</h4><p>${notes}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/sell-items" 
                 style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                📋 Review Offer
              </a>
            </div>
            <p>Please review and respond within 2-3 business days.</p>
            <p>Best regards,<br><strong>System Notification</strong></p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }

    res.json({ 
      message: 'Offer submitted successfully', 
      item: {
        id: newItem.id,
        itemTitle: newItem.itemTitle,
        status: newItem.status,
        submittedAt: newItem.submittedAt,
        imageCount: uploadedImages.length
      }
    });

  } catch (error) {
    console.error('Error submitting sell item:', error);
    res.status(500).json({ error: 'Failed to submit offer' });
  }
});

// 📊 Get user's submitted items
router.get('/user/:userEmail', authenticateToken, (req, res) => {
  try {
    const { userEmail } = req.params;
    const requestingUser = req.user.email;
    
    // Only allow users to see their own items or admins to see any
    if (requestingUser !== userEmail && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sellItems = readSellItems();
    const userItems = sellItems.filter(item => item.submittedBy === userEmail);

    // Remove sensitive admin data from response
    const safeItems = userItems.map(item => ({
      id: item.id,
      itemTitle: item.itemTitle,
      category: item.category,
      condition: item.condition,
      status: item.status,
      submittedAt: item.submittedAt,
      reviewedAt: item.reviewedAt,
      adminEstimate: item.adminEstimate,
      suggestedReserve: item.suggestedReserve,
      imageCount: item.images.length,
      auctionId: item.auctionId,
      finalSalePrice: item.finalSalePrice
    }));

    res.json(safeItems);

  } catch (error) {
    console.error('Error getting user sell items:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
});

// 📊 Get all submitted items (Admin only)
router.get('/admin/all', verifyAdmin, (req, res) => {
  try {
    const sellItems = readSellItems();
    
    // Add summary statistics
    const stats = {
      total: sellItems.length,
      pending: sellItems.filter(item => item.status === 'pending').length,
      approved: sellItems.filter(item => item.status === 'approved').length,
      rejected: sellItems.filter(item => item.status === 'rejected').length,
      inAuction: sellItems.filter(item => item.status === 'in_auction').length,
      sold: sellItems.filter(item => item.status === 'sold').length
    };

    res.json({ items: sellItems, stats });

  } catch (error) {
    console.error('Error getting all sell items:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
});

// 📝 Admin review and respond to item submission
router.post('/admin/:itemId/review', verifyAdmin, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { 
      status, 
      adminNotes, 
      adminEstimate, 
      suggestedReserve,
      counterOffer 
    } = req.body;

    // Validation
    if (!status || !['approved', 'rejected', 'needs_info'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: approved, rejected, or needs_info' 
      });
    }

    const sellItems = readSellItems();
    const itemIndex = sellItems.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = sellItems[itemIndex];

    // Update item
    sellItems[itemIndex] = {
      ...item,
      status,
      adminNotes: adminNotes || '',
      adminEstimate: adminEstimate ? parseFloat(adminEstimate) : item.adminEstimate,
      suggestedReserve: suggestedReserve ? parseFloat(suggestedReserve) : item.suggestedReserve,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.email,
      counterOffer: counterOffer || null
    };

    writeSellItems(sellItems);

    // Send email notification to seller
    const emailSubject = status === 'approved' ? 
      `Item Approved - ${item.itemTitle}` :
      status === 'rejected' ?
      `Item Review Update - ${item.itemTitle}` :
      `Additional Information Needed - ${item.itemTitle}`;

    const statusColors = {
      approved: '#059669',
      rejected: '#dc2626',
      needs_info: '#d97706'
    };

    const statusMessages = {
      approved: '🎉 Great news! Your item has been approved for auction.',
      rejected: '😔 After review, we cannot accept this item for auction at this time.',
      needs_info: '🤔 We need additional information about your item.'
    };

    try {
      await sendMail({
        to: item.submittedBy,
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${statusColors[status]};">📋 Item Review Update</h2>
            <p>${statusMessages[status]}</p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Item Details:</h3>
              <p><strong>Title:</strong> ${item.itemTitle}</p>
              <p><strong>Category:</strong> ${item.category}</p>
              <p><strong>Status:</strong> <span style="color: ${statusColors[status]}; font-weight: bold;">${status.toUpperCase()}</span></p>
              <p><strong>Reviewed by:</strong> ${req.user.email}</p>
              <p><strong>Review Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${adminEstimate ? `
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #059669;">Professional Valuation:</h4>
              <p><strong>Estimated Value:</strong> R${adminEstimate.toLocaleString()}</p>
              ${suggestedReserve ? `<p><strong>Suggested Reserve:</strong> R${suggestedReserve.toLocaleString()}</p>` : ''}
            </div>
            ` : ''}
            
            ${adminNotes ? `
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4>Notes from our team:</h4>
              <p>${adminNotes}</p>
            </div>
            ` : ''}
            
            ${status === 'approved' ? `
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #059669;">Next Steps:</h4>
              <p style="color: #059669;">
                • Your item will be included in our next suitable auction<br>
                • We'll notify you of the auction date and details<br>
                • High-quality photos will be taken for the catalog<br>
                • You'll receive updates throughout the auction process
              </p>
            </div>
            ` : ''}
            
            ${status === 'needs_info' ? `
            <div style="background: #fefce8; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #a16207;">Action Required:</h4>
              <p style="color: #a16207;">
                Please respond with the requested information so we can complete our review.
              </p>
            </div>
            ` : ''}
            
            <p>Thank you for choosing ALL4YOU AUCTIONEERS.</p>
            
            <p>Best regards,<br><strong>ALL4YOU AUCTIONEERS Team</strong></p>
          </div>
        `,
        text: `
Item Review Update - ${item.itemTitle}

Status: ${status.toUpperCase()}
${adminEstimate ? `Estimated Value: R${adminEstimate.toLocaleString()}` : ''}
${suggestedReserve ? `Suggested Reserve: R${suggestedReserve.toLocaleString()}` : ''}

${adminNotes ? `Notes: ${adminNotes}` : ''}

${statusMessages[status]}

- ALL4YOU AUCTIONEERS Team
        `
      });
    } catch (emailError) {
      console.error('Failed to send review email:', emailError);
    }

    res.json({ 
      message: 'Item review completed successfully',
      item: sellItems[itemIndex]
    });

  } catch (error) {
    console.error('Error reviewing sell item:', error);
    res.status(500).json({ error: 'Failed to review item' });
  }
});

// 🖼️ Download item image
router.get('/image/:itemId/:imageFilename', (req, res) => {
  try {
    const { itemId, imageFilename } = req.params;
    
    const sellItems = readSellItems();
    const item = sellItems.find(item => item.id === itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const image = item.images.find(img => img.filename === imageFilename);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imagePath = path.join(SELL_UPLOADS_DIR, imageFilename);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    res.sendFile(imagePath);

  } catch (error) {
    console.error('Error serving item image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// 🏷️ Assign item to auction (Admin only)
router.post('/admin/:itemId/assign-auction', verifyAdmin, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { auctionId, lotNumber, finalReserve } = req.body;

    if (!auctionId) {
      return res.status(400).json({ error: 'Auction ID is required' });
    }

    const sellItems = readSellItems();
    const itemIndex = sellItems.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = sellItems[itemIndex];

    if (item.status !== 'approved') {
      return res.status(400).json({ error: 'Item must be approved before auction assignment' });
    }

    // Update item status
    sellItems[itemIndex] = {
      ...item,
      status: 'in_auction',
      auctionId,
      lotNumber,
      finalReserve: finalReserve ? parseFloat(finalReserve) : item.suggestedReserve,
      assignedToAuctionAt: new Date().toISOString(),
      assignedBy: req.user.email
    };

    writeSellItems(sellItems);

    // Send notification to seller
    try {
      await sendMail({
        to: item.submittedBy,
        subject: `Your Item is Going to Auction - ${item.itemTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🎯 Your Item is Going to Auction!</h2>
            <p>Exciting news! Your item has been assigned to an upcoming auction.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>Auction Details:</h3>
              <p><strong>Item:</strong> ${item.itemTitle}</p>
              <p><strong>Auction ID:</strong> ${auctionId}</p>
              ${lotNumber ? `<p><strong>Lot Number:</strong> ${lotNumber}</p>` : ''}
              <p><strong>Reserve Price:</strong> R${(finalReserve || item.suggestedReserve || 0).toLocaleString()}</p>
              <p><strong>Assigned Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #a16207;">What happens next:</h4>
              <p style="color: #a16207;">
                • Professional catalog photos will be taken<br>
                • Your item will appear in the auction catalog<br>
                • You'll receive the auction date and viewing times<br>
                • We'll keep you updated on bidding activity<br>
                • Payment will be processed after successful sale
              </p>
            </div>
            
            <p>Thank you for consigning with ALL4YOU AUCTIONEERS!</p>
            
            <p>Best regards,<br><strong>ALL4YOU AUCTIONEERS Team</strong></p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send auction assignment email:', emailError);
    }

    res.json({ 
      message: 'Item assigned to auction successfully',
      item: sellItems[itemIndex]
    });

  } catch (error) {
    console.error('Error assigning item to auction:', error);
    res.status(500).json({ error: 'Failed to assign item to auction' });
  }
});

module.exports = router;
