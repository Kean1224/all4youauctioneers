const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Enhanced File Upload Security Middleware
 * Addresses security vulnerabilities in file uploads
 */
class SecureFileUpload {
  constructor() {
    this.allowedMimeTypes = {
      images: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp',
        'image/gif'
      ],
      documents: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fica: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ]
    };

    this.maxFileSizes = {
      images: 5 * 1024 * 1024,      // 5MB
      documents: 10 * 1024 * 1024,  // 10MB
      fica: 5 * 1024 * 1024         // 5MB
    };

    this.dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
      '.jar', '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py'
    ];
  }

  /**
   * Create secure storage configuration
   */
  createStorage(uploadType, subPath = '') {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const uploadPath = path.join(__dirname, '..', 'uploads', uploadType, subPath);
          
          // Ensure directory exists
          await fs.mkdir(uploadPath, { recursive: true });
          
          // Set secure permissions (if on Unix-like systems)
          try {
            await fs.chmod(uploadPath, 0o755);
          } catch (e) {
            // Ignore on Windows
          }
          
          cb(null, uploadPath);
        } catch (error) {
          console.error('Upload directory creation failed:', error);
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        // Generate secure filename
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(8).toString('hex');
        const sanitizedOriginalName = this.sanitizeFilename(file.originalname);
        const extension = path.extname(sanitizedOriginalName).toLowerCase();
        
        // Validate extension
        if (this.dangerousExtensions.includes(extension)) {
          return cb(new Error(`File extension ${extension} is not allowed for security reasons`));
        }
        
        const secureFilename = `${timestamp}_${randomBytes}${extension}`;
        cb(null, secureFilename);
      }
    });
  }

  /**
   * Sanitize filename to prevent directory traversal
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')  // Replace special chars
      .replace(/\.+/g, '.')               // Collapse multiple dots
      .replace(/^\.+|\.+$/g, '')          // Remove leading/trailing dots
      .substring(0, 100);                 // Limit length
  }

  /**
   * Enhanced file filter with security checks
   */
  createFileFilter(uploadType) {
    return (req, file, cb) => {
      try {
        console.log(`🔍 Security scan: ${file.originalname} (${file.mimetype})`);
        
        // 1. MIME type validation
        const allowedTypes = this.allowedMimeTypes[uploadType];
        if (!allowedTypes || !allowedTypes.includes(file.mimetype)) {
          console.error(`❌ Invalid MIME type: ${file.mimetype} for upload type: ${uploadType}`);
          return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes?.join(', ')}`));
        }

        // 2. File extension validation
        const extension = path.extname(file.originalname).toLowerCase();
        if (this.dangerousExtensions.includes(extension)) {
          console.error(`❌ Dangerous file extension: ${extension}`);
          return cb(new Error(`File extension ${extension} is potentially dangerous and not allowed`));
        }

        // 3. Filename validation
        const filename = file.originalname;
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          console.error(`❌ Path traversal attempt in filename: ${filename}`);
          return cb(new Error('Filename contains invalid characters'));
        }

        // 4. Empty filename check
        if (!filename || filename.trim().length === 0) {
          console.error('❌ Empty filename');
          return cb(new Error('Filename cannot be empty'));
        }

        // 5. Length validation
        if (filename.length > 200) {
          console.error(`❌ Filename too long: ${filename.length} chars`);
          return cb(new Error('Filename is too long (max 200 characters)'));
        }

        console.log(`✅ File passed security checks: ${filename}`);
        cb(null, true);
        
      } catch (error) {
        console.error('File filter error:', error);
        cb(new Error('File validation failed'));
      }
    };
  }

  /**
   * Create secure multer instance for FICA uploads
   */
  createFicaUpload() {
    return multer({
      storage: this.createStorage('fica'),
      fileFilter: this.createFileFilter('fica'),
      limits: {
        fileSize: this.maxFileSizes.fica,
        files: 5,              // Max 5 files per upload
        fieldSize: 1024,       // 1KB field size
        fieldNameSize: 100,    // 100 bytes field name
        headerPairs: 20,       // Max header pairs
        parts: 10              // Max parts
      }
    });
  }

  /**
   * Create secure multer instance for general images
   */
  createImageUpload() {
    return multer({
      storage: this.createStorage('images'),
      fileFilter: this.createFileFilter('images'),
      limits: {
        fileSize: this.maxFileSizes.images,
        files: 10,
        fieldSize: 1024,
        fieldNameSize: 100,
        headerPairs: 20,
        parts: 15
      }
    });
  }

  /**
   * Create secure multer instance for documents
   */
  createDocumentUpload() {
    return multer({
      storage: this.createStorage('documents'),
      fileFilter: this.createFileFilter('documents'),
      limits: {
        fileSize: this.maxFileSizes.documents,
        files: 3,
        fieldSize: 1024,
        fieldNameSize: 100,
        headerPairs: 20,
        parts: 8
      }
    });
  }

  /**
   * Middleware to validate uploaded files post-upload
   */
  createPostUploadValidator() {
    return async (req, res, next) => {
      try {
        if (!req.files && !req.file) {
          return next();
        }

        const files = req.files || [req.file].filter(Boolean);
        
        for (const file of files) {
          // Additional post-upload validation
          await this.validateUploadedFile(file);
        }
        
        next();
      } catch (error) {
        console.error('Post-upload validation failed:', error);
        
        // Cleanup uploaded files on validation failure
        await this.cleanupUploadedFiles(req.files || [req.file].filter(Boolean));
        
        res.status(400).json({
          success: false,
          error: error.message || 'File validation failed'
        });
      }
    };
  }

  /**
   * Validate uploaded file (additional security checks)
   */
  async validateUploadedFile(file) {
    if (!file || !file.path) return;

    try {
      // Check if file actually exists
      const stats = await fs.stat(file.path);
      
      // Verify file size matches what was uploaded
      if (stats.size !== file.size) {
        throw new Error('File size mismatch - possible corruption');
      }

      // Additional size check
      if (stats.size === 0) {
        throw new Error('Empty file uploaded');
      }

      // Check for suspicious file characteristics
      if (stats.size > 50 * 1024 * 1024) { // 50MB absolute max
        throw new Error('File too large (exceeds absolute maximum)');
      }

      console.log(`✅ Post-upload validation passed: ${file.filename} (${stats.size} bytes)`);
      
    } catch (error) {
      console.error(`❌ Post-upload validation failed for ${file.filename}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup uploaded files on error
   */
  async cleanupUploadedFiles(files) {
    for (const file of files) {
      if (file && file.path) {
        try {
          await fs.unlink(file.path);
          console.log(`🗑️  Cleaned up file: ${file.path}`);
        } catch (error) {
          console.error(`Failed to cleanup file ${file.path}:`, error.message);
        }
      }
    }
  }

  /**
   * Get upload statistics
   */
  getUploadStats() {
    return {
      allowedMimeTypes: this.allowedMimeTypes,
      maxFileSizes: this.maxFileSizes,
      dangerousExtensions: this.dangerousExtensions.length
    };
  }
}

// Export singleton instance
module.exports = new SecureFileUpload();