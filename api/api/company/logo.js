const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verifyAdmin = require('../auth/verify-admin');

const router = express.Router();

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const assetsDir = path.join(__dirname, '../../assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    cb(null, assetsDir);
  },
  filename: (req, file, cb) => {
    // Always save as logo.png for consistency
    cb(null, 'logo.png');
  }
});

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
router.post('/upload', verifyAdmin, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    const logoPath = req.file.path;
    const logoStats = fs.statSync(logoPath);

    res.json({
      success: true,
      message: 'Company logo uploaded successfully',
      logo: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: logoStats.size,
        path: logoPath,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// 📥 Get current company logo
router.get('/current', (req, res) => {
  try {
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ 
        error: 'No company logo found',
        message: 'Upload a logo using POST /api/company/logo/upload'
      });
    }

    const logoStats = fs.statSync(logoPath);
    
    res.json({
      success: true,
      logo: {
        filename: 'logo.png',
        size: logoStats.size,
        lastModified: logoStats.mtime,
        downloadUrl: '/api/company/logo/download'
      }
    });

  } catch (error) {
    console.error('Error getting logo info:', error);
    res.status(500).json({ error: 'Failed to get logo information' });
  }
});

// 📥 Download/display company logo
router.get('/download', (req, res) => {
  try {
    const logoPath = path.join(__dirname, '../../assets/logo.png');
    
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    // Set appropriate headers for image display
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Send the logo file
    res.sendFile(logoPath);

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