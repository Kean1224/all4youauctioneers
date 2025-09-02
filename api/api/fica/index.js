// backend/api/fica/index.js
const express = require('express');
const router = express.Router();
const secureUpload = require('../../middleware/secure-upload');
const dbModels = require('../../database/models');

// List all FICA uploads (admin)
router.get('/', async (req, res) => {
  try {
    // Get all FICA documents from PostgreSQL
    const query = `
      SELECT fd.*, u.name, u.email_verified 
      FROM fica_documents fd 
      LEFT JOIN users u ON fd.user_email = u.email 
      ORDER BY fd.uploaded_at DESC
    `;
    
    const result = await require('../../database/connection').query(query);
    const ficaDocuments = result.rows.map(doc => ({
      email: doc.user_email,
      status: doc.status || 'pending',
      fileUrl: doc.file_url,
      originalName: doc.original_filename,
      uploadDate: doc.uploaded_at,
      fileSize: doc.file_size,
      mimetype: doc.mime_type,
      reviewedAt: doc.reviewed_at,
      reviewedBy: doc.reviewed_by,
      rejectionReason: doc.rejection_reason,
      userName: doc.name,
      emailVerified: doc.email_verified
    }));
    
    res.json(ficaDocuments);
  } catch (error) {
    console.error('Error listing FICA documents:', error);
    res.status(500).json({ error: 'Failed to list FICA documents' });
  }
});

// Get FICA status for a user
router.get('/:email', async (req, res) => {
  try {
    const ficaStatus = await dbModels.getFicaStatus(req.params.email);
    if (ficaStatus) {
      res.json({
        email: ficaStatus.user_email,
        status: ficaStatus.status || 'pending',
        fileUrl: ficaStatus.file_url,
        originalName: ficaStatus.original_filename,
        uploadDate: ficaStatus.uploaded_at,
        fileSize: ficaStatus.file_size,
        mimetype: ficaStatus.mime_type,
        reviewedAt: ficaStatus.reviewed_at,
        reviewedBy: ficaStatus.reviewed_by,
        rejectionReason: ficaStatus.rejection_reason
      });
    } else {
      res.json({ status: 'not_uploaded' });
    }
  } catch (error) {
    console.error('Error getting FICA status:', error);
    res.status(500).json({ error: 'Failed to get FICA status' });
  }
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
      
      // Store FICA document in PostgreSQL
      const ficaData = {
        user_email: email,
        file_url: fileUrl,
        original_filename: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      };

      const storedDocument = await dbModels.storeFicaDocument(ficaData);

      console.log(`✅ FICA document uploaded securely: ${email} -> ${req.file.filename}`);

      res.json({ 
        success: true,
        message: 'FICA document uploaded successfully',
        filename: req.file.filename,
        fileSize: req.file.size,
        uploadDate: storedDocument.uploaded_at,
        id: storedDocument.id
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
router.post('/:email/approve', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Update FICA document status in PostgreSQL
    const query = `
      UPDATE fica_documents 
      SET status = 'approved',
          reviewed_at = CURRENT_TIMESTAMP,
          reviewed_by = $2
      WHERE user_email = $1
      RETURNING *
    `;
    
    const result = await require('../../database/connection').query(query, [
      email, 
      req.user?.email || 'admin' // Assuming admin middleware sets req.user
    ]);
    
    if (result.rows.length > 0) {
      // Also update user's FICA status
      await dbModels.updateUser(email, { fica_approved: true });
      
      console.log(`✅ FICA approved for ${email}`);
      res.json({ success: true, document: result.rows[0] });
    } else {
      res.status(404).json({ error: 'FICA document not found' });
    }
  } catch (error) {
    console.error('Error approving FICA:', error);
    res.status(500).json({ error: 'Failed to approve FICA document' });
  }
});

// Reject FICA (admin)
router.post('/:email/reject', async (req, res) => {
  try {
    const { email } = req.params;
    const { reason } = req.body;
    
    // Update FICA document status in PostgreSQL
    const query = `
      UPDATE fica_documents 
      SET status = 'rejected',
          reviewed_at = CURRENT_TIMESTAMP,
          reviewed_by = $2,
          rejection_reason = $3
      WHERE user_email = $1
      RETURNING *
    `;
    
    const result = await require('../../database/connection').query(query, [
      email,
      req.user?.email || 'admin',
      reason || 'No reason provided'
    ]);
    
    if (result.rows.length > 0) {
      // Also update user's FICA status and rejection reason
      await dbModels.updateUser(email, { 
        fica_approved: false, 
        rejection_reason: reason || 'FICA document rejected'
      });
      
      console.log(`❌ FICA rejected for ${email}: ${reason}`);
      res.json({ success: true, document: result.rows[0] });
    } else {
      res.status(404).json({ error: 'FICA document not found' });
    }
  } catch (error) {
    console.error('Error rejecting FICA:', error);
    res.status(500).json({ error: 'Failed to reject FICA document' });
  }
});

module.exports = router;
