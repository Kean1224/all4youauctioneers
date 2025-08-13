const fs = require('fs');
const path = require('path');

// 📁 Production-ready storage solution
class StorageManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.uploadDir = this.isProduction 
      ? process.env.FILE_STORAGE_PATH || '/tmp/uploads'
      : path.join(__dirname, '../uploads');
  }

  // Ensure upload directories exist
  ensureUploadDirs() {
    const dirs = [
      'fica',
      'lots', 
      'invoices',
      'auctions',
      'deposits',
      'items',
      'sell'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created upload directory: ${fullPath}`);
      }
    });
  }

  // Get storage configuration for multer
  getMulterConfig(subDir = '') {
    const destination = subDir 
      ? path.join(this.uploadDir, subDir)
      : this.uploadDir;

    return {
      destination: (req, file, cb) => {
        // Ensure directory exists
        if (!fs.existsSync(destination)) {
          fs.mkdirSync(destination, { recursive: true });
        }
        cb(null, destination);
      },
      filename: (req, file, cb) => {
        // Generate secure filename
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const ext = path.extname(file.originalname);
        const safeName = file.originalname
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .substring(0, 50);
        
        cb(null, `${timestamp}-${random}-${safeName}${ext}`);
      }
    };
  }

  // Clean up old files (for production memory management)
  async cleanupOldFiles(maxAgeHours = 24) {
    if (!this.isProduction) return;

    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      const tempDirs = ['invoices', 'temp'];

      for (const dir of tempDirs) {
        const dirPath = path.join(this.uploadDir, dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
              fs.unlinkSync(filePath);
              console.log(`🗑️  Cleaned up old file: ${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Get public URL for uploaded files
  getPublicUrl(filename, subDir = '') {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const urlPath = subDir ? `/uploads/${subDir}/${filename}` : `/uploads/${filename}`;
    return `${baseUrl}${urlPath}`;
  }
}

// Initialize storage manager
const storageManager = new StorageManager();

// Auto-cleanup for production
if (storageManager.isProduction) {
  // Clean up old files every hour
  setInterval(() => {
    storageManager.cleanupOldFiles();
  }, 60 * 60 * 1000);
}

module.exports = storageManager;