const express = require('express');
const router = express.Router();
const verifyAdmin = require('../auth/verify-admin');

/**
 * Admin endpoint to trigger Cloudinary migration
 * POST /api/admin/migrate-cloudinary
 */
router.post('/', verifyAdmin, async (req, res) => {
  console.log('🚀 Admin-triggered Cloudinary migration started...');
  
  try {
    // Import migration class
    const ProductionMigration = require('../../scripts/migrate-to-cloudinary-production');
    
    // Create migration instance  
    const migration = new ProductionMigration();
    
    // Capture console output
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      originalLog(...args); // Still log to server console
    };
    
    try {
      // Run migration
      await migration.run();
      
      // Restore console.log
      console.log = originalLog;
      
      res.json({
        success: true,
        message: 'Migration completed successfully',
        logs: logs,
        stats: migration.stats
      });
      
    } catch (migrationError) {
      console.log = originalLog; // Restore console.log
      
      console.error('❌ Migration failed:', migrationError);
      res.status(500).json({
        success: false,
        error: migrationError.message,
        logs: logs
      });
    }
    
  } catch (error) {
    console.error('❌ Migration endpoint error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to start migration: ${error.message}`
    });
  }
});

/**
 * Check migration status
 * GET /api/admin/migrate-cloudinary/status
 */
router.get('/status', verifyAdmin, async (req, res) => {
  try {
    const dbManager = require('../../database/connection');
    await dbManager.initialize();
    
    const ficaCount = await dbManager.query('SELECT COUNT(*) as count FROM fica_documents WHERE file_url LIKE $1', ['data:%']);
    const lotsCount = await dbManager.query('SELECT COUNT(*) as count FROM lots WHERE image_urls::text LIKE $1', ['%data:%']);
    
    const ficaTotal = await dbManager.query('SELECT COUNT(*) as count FROM fica_documents');
    const lotsTotal = await dbManager.query('SELECT COUNT(*) as count FROM lots');
    
    res.json({
      status: 'success',
      migration: {
        ficaDocuments: {
          total: parseInt(ficaTotal.rows[0].count),
          needingMigration: parseInt(ficaCount.rows[0].count),
          migrated: parseInt(ficaTotal.rows[0].count) - parseInt(ficaCount.rows[0].count)
        },
        lotImages: {
          total: parseInt(lotsTotal.rows[0].count),
          needingMigration: parseInt(lotsCount.rows[0].count),
          migrated: parseInt(lotsTotal.rows[0].count) - parseInt(lotsCount.rows[0].count)
        }
      },
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
      }
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;