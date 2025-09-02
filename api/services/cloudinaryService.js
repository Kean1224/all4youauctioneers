const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Cloudinary File Upload Service
 * Replaces base64 database storage with cloud storage
 */
class CloudinaryService {
  
  /**
   * Upload file buffer to Cloudinary
   * @param {Buffer} fileBuffer - The file buffer
   * @param {Object} options - Upload options
   * @param {string} options.originalname - Original filename
   * @param {string} options.mimetype - File mimetype
   * @param {string} options.folder - Cloudinary folder (e.g., 'fica', 'lots', 'deposits')
   * @param {string} options.userEmail - User email for organizing files
   * @returns {Promise<Object>} Cloudinary upload result
   */
  async uploadFile(fileBuffer, options = {}) {
    try {
      const { originalname, mimetype, folder = 'uploads', userEmail } = options;
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
      const fileExtension = originalname ? originalname.split('.').pop() : 'bin';
      const publicId = `${folder}/${sanitizedEmail}/${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto', // Automatically detect file type
            public_id: publicId,
            folder: folder,
            use_filename: true,
            unique_filename: false,
            overwrite: true,
            // Add metadata
            context: {
              originalname: originalname || 'unknown',
              mimetype: mimetype || 'application/octet-stream',
              userEmail: userEmail || 'unknown',
              uploadedAt: new Date().toISOString()
            }
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log(`✅ File uploaded to Cloudinary: ${result.secure_url}`);
              resolve(result);
            }
          }
        );
        
        // Convert buffer to stream and pipe to Cloudinary
        const stream = Readable.from(fileBuffer);
        stream.pipe(uploadStream);
      });
    } catch (error) {
      console.error('CloudinaryService uploadFile error:', error);
      throw error;
    }
  }

  /**
   * Upload FICA document (ID, proof of address, bank statement)
   * @param {Buffer} fileBuffer - The file buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with secure URL
   */
  async uploadFicaDocument(fileBuffer, options = {}) {
    try {
      const result = await this.uploadFile(fileBuffer, {
        ...options,
        folder: 'fica'
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        originalname: options.originalname,
        size: result.bytes,
        mimetype: options.mimetype,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error('FICA document upload error:', error);
      throw error;
    }
  }

  /**
   * Upload auction lot image
   * @param {Buffer} fileBuffer - The image buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with optimized URLs
   */
  async uploadLotImage(fileBuffer, options = {}) {
    try {
      const result = await this.uploadFile(fileBuffer, {
        ...options,
        folder: 'lots'
      });
      
      // Generate different sized URLs for lot images
      const baseUrl = result.secure_url.replace('/upload/', '/upload/');
      
      return {
        url: result.secure_url,
        thumbnailUrl: baseUrl.replace('/upload/', '/upload/c_fill,h_300,w_300/'),
        largeUrl: baseUrl.replace('/upload/', '/upload/c_limit,h_1200,w_1200/'),
        publicId: result.public_id,
        originalname: options.originalname,
        size: result.bytes,
        mimetype: options.mimetype,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error('Lot image upload error:', error);
      throw error;
    }
  }

  /**
   * Upload deposit proof file
   * @param {Buffer} fileBuffer - The file buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadDepositProof(fileBuffer, options = {}) {
    try {
      const result = await this.uploadFile(fileBuffer, {
        ...options,
        folder: 'deposits'
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        originalname: options.originalname,
        size: result.bytes,
        mimetype: options.mimetype,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error('Deposit proof upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - The Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ File deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  }

  /**
   * Convert base64 data URL to buffer
   * @param {string} dataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,...")
   * @returns {Object} Buffer and metadata
   */
  base64ToBuffer(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      throw new Error('Invalid base64 data URL');
    }
    
    const [header, base64Data] = dataUrl.split(',');
    const mimetype = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const buffer = Buffer.from(base64Data, 'base64');
    
    return { buffer, mimetype };
  }

  /**
   * Migrate base64 data to Cloudinary
   * @param {string} base64DataUrl - Base64 data URL from database
   * @param {Object} options - Migration options
   * @returns {Promise<string>} New Cloudinary URL
   */
  async migrateBase64ToCloudinary(base64DataUrl, options = {}) {
    try {
      if (!base64DataUrl || !base64DataUrl.startsWith('data:')) {
        throw new Error('Invalid base64 data URL for migration');
      }

      const { buffer, mimetype } = this.base64ToBuffer(base64DataUrl);
      
      const uploadOptions = {
        mimetype,
        originalname: options.originalname || 'migrated_file',
        userEmail: options.userEmail || 'migration',
        folder: options.folder || 'migrated'
      };

      const result = await this.uploadFile(buffer, uploadOptions);
      return result.secure_url;
    } catch (error) {
      console.error('Base64 migration error:', error);
      throw error;
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Image transformations
   * @returns {string} Transformed image URL
   */
  getOptimizedUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
  }

  /**
   * Health check for Cloudinary service
   * @returns {Promise<boolean>} Service health status
   */
  async healthCheck() {
    try {
      const result = await cloudinary.api.ping();
      return result.status === 'ok';
    } catch (error) {
      console.error('Cloudinary health check failed:', error);
      return false;
    }
  }
}

module.exports = new CloudinaryService();