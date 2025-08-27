// backend/api/fica/index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const secureUpload = require('../../middleware/secure-upload');
const atomicData = require('../../utils/atomic-data');

const FICA_DATA_PATH = path.join(__dirname, '../../data/fica.json');

function readFicaData() {
  if (!fs.existsSync(FICA_DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(FICA_DATA_PATH, 'utf8'));
}
function writeFicaData(data) {
  fs.writeFileSync(FICA_DATA_PATH, JSON.stringify(data, null, 2));
}

// List all FICA uploads (admin)
router.get('/', (req, res) => {
  const data = readFicaData();
  res.json(data);
});

// Get FICA status for a user
router.get('/:email', (req, res) => {
  const data = readFicaData();
  const entry = data.find(f => f.email === req.params.email);
  res.json(entry || { status: 'not_uploaded' });
});

// Upload FICA document - SECURE VERSION with validation
router.post('/:email', 
  secureUpload.createFicaUpload().single('file'),
  secureUpload.createPostUploadValidator(),
  async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded' 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        // Cleanup uploaded file
        await secureUpload.cleanupUploadedFiles([req.file]);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email format' 
        });
      }

      const fileUrl = `/uploads/fica/${req.file.filename}`;
      const uploadData = {
        email: email,
        status: 'pending',
        fileUrl: fileUrl,
        originalName: req.file.originalname,
        uploadDate: new Date().toISOString(),
        fileSize: req.file.size,
        mimetype: req.file.mimetype
      };

      // Use atomic operation to prevent race conditions
      await atomicData.atomicReadModifyWrite('fica.json', (data) => {
        const existingIndex = data.findIndex(f => f.email === email);
        
        if (existingIndex !== -1) {
          // Update existing entry
          data[existingIndex] = {
            ...data[existingIndex],
            ...uploadData,
            previousFiles: data[existingIndex].previousFiles || []
          };
          
          // Keep track of previous file if exists
          if (data[existingIndex].fileUrl && data[existingIndex].fileUrl !== fileUrl) {
            data[existingIndex].previousFiles.push({
              fileUrl: data[existingIndex].fileUrl,
              replacedDate: new Date().toISOString()
            });
          }
        } else {
          // Create new entry
          data.push(uploadData);
        }
        
        return data;
      }, { defaultData: [] });

      console.log(`✅ FICA document uploaded securely: ${email} -> ${req.file.filename}`);

      res.json({ 
        success: true,
        message: 'FICA document uploaded successfully',
        filename: req.file.filename,
        fileSize: req.file.size,
        uploadDate: uploadData.uploadDate
      });
      
    } catch (error) {
      console.error('FICA upload error:', error);
      
      // Cleanup uploaded file on error
      if (req.file) {
        await secureUpload.cleanupUploadedFiles([req.file]);
      }
      
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Upload failed' 
      });
    }
  });

// Approve FICA (admin)
router.post('/:email/approve', (req, res) => {
  const data = readFicaData();
  const entry = data.find(f => f.email === req.params.email);
  if (entry) {
    entry.status = 'approved';
    writeFicaData(data);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

// Reject FICA (admin)
router.post('/:email/reject', (req, res) => {
  const data = readFicaData();
  const entry = data.find(f => f.email === req.params.email);
  if (entry) {
    entry.status = 'rejected';
    writeFicaData(data);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
