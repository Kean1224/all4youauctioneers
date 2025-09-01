const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyAdmin = require('../auth/verify-admin');
const dbModels = require('../../database/models');

const router = express.Router();

// Configure multer for memory storage (logo will be stored in PostgreSQL)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// 📤 Upload company logo (Admin only)
router.post('/upload', verifyAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    // Store logo in PostgreSQL
    const logoData = await dbModels.storeCompanyLogo({
      file_url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype
    });

    res.json({
      success: true,
      message: 'Company logo uploaded successfully',
      logo: {
        id: logoData.id,
        originalName: logoData.original_filename,
        size: logoData.file_size,
        mimeType: logoData.mime_type,
        uploadedAt: logoData.created_at
      }
    });

  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// 📥 Get current company logo
router.get('/current', async (req, res) => {
  try {
    const logo = await dbModels.getCompanyLogo();
    
    if (!logo) {
      return res.status(404).json({ 
        error: 'No company logo found',
        message: 'Upload a logo using POST /api/company/logo/upload'
      });
    }
    
    res.json({
      success: true,
      logo: {
        id: logo.id,
        originalName: logo.original_filename,
        size: logo.file_size,
        mimeType: logo.mime_type,
        lastModified: logo.updated_at,
        downloadUrl: '/api/company/logo/download'
      }
    });

  } catch (error) {
    console.error('Error getting logo info:', error);
    res.status(500).json({ error: 'Failed to get logo information' });
  }
});

// 📥 Download/display company logo
router.get('/download', async (req, res) => {
  try {
    const logo = await dbModels.getCompanyLogo();
    
    if (!logo) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    // Extract base64 data and mime type
    const base64Data = logo.file_url.split(',')[1];
    const mimeType = logo.mime_type || 'image/png';
    
    // Set appropriate headers for image display
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Send the logo as buffer
    const buffer = Buffer.from(base64Data, 'base64');
    res.send(buffer);

  } catch (error) {
    console.error('Error serving logo:', error);
    res.status(500).json({ error: 'Failed to serve logo' });
  }
});

// 🗑️ Delete company logo (Admin only)
router.delete('/delete', verifyAdmin, (req, res) => {
  try {
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'No logo to delete' });
    }

    fs.unlinkSync(logoPath);

    res.json({
      success: true,
      message: 'Company logo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

module.exports = router;