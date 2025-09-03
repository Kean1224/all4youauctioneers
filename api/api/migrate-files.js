const express = require('express');
const router = express.Router();

/**
 * Simple migration endpoint (temporary - remove after migration)
 * GET /api/migrate-files - Check status
 * POST /api/migrate-files - Run migration
 */

router.get('/', async (req, res) => {
  try {
    const dbManager = require('../database/connection');
    await dbManager.initialize();
    
    console.log('📊 Checking migration status...');
    
    const ficaCount = await dbManager.query('SELECT COUNT(*) as count FROM fica_documents WHERE file_url LIKE $1', ['data:%']);
    const lotsCount = await dbManager.query('SELECT COUNT(*) as count FROM lots WHERE image_urls::text LIKE $1', ['%data:%']);
    
    const ficaTotal = await dbManager.query('SELECT COUNT(*) as count FROM fica_documents');
    const lotsTotal = await dbManager.query('SELECT COUNT(*) as count FROM lots');
    
    const status = {
      timestamp: new Date().toISOString(),
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'Not configured'
      },
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
      }
    };
    
    console.log('📊 Migration status:', status);
    res.json(status);
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/', async (req, res) => {
  console.log('🚀 Starting Cloudinary migration...');
  
  try {
    // Test Cloudinary connection first
    const cloudinaryService = require('../services/cloudinaryService');
    const isHealthy = await Promise.race([
      cloudinaryService.healthCheck(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 15000))
    ]);
    
    if (!isHealthy) {
      return res.status(503).json({
        error: 'Cloudinary service not available',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Cloudinary connection verified');
    
    // Import and run migration
    const ProductionMigration = require('../scripts/migrate-to-cloudinary-production');
    const migration = new ProductionMigration();
    
    // Capture logs
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      originalLog(...args);
    };
    
    try {
      await migration.run();
      console.log = originalLog;
      
      res.json({
        success: true,
        message: 'Migration completed successfully',
        timestamp: new Date().toISOString(),
        stats: migration.stats,
        logs: logs.slice(-20) // Last 20 log messages
      });
      
    } catch (migrationError) {
      console.log = originalLog;
      console.error('❌ Migration failed:', migrationError);
      
      res.status(500).json({
        success: false,
        error: migrationError.message,
        timestamp: new Date().toISOString(),
        logs: logs.slice(-20)
      });
    }
    
  } catch (error) {
    console.error('❌ Migration endpoint error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;