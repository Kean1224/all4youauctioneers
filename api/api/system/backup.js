const express = require('express');
const router = express.Router();

// Import middleware with error handling
let verifyAdmin;
try {
  const auth = require('../../middleware/auth');
  verifyAdmin = auth.verifyAdmin;
} catch (error) {
  console.error('❌ Failed to load auth middleware:', error.message);
  verifyAdmin = (req, res, next) => {
    res.status(500).json({ error: 'Auth system unavailable' });
  };
}

// Import BackupManager with error handling
let backupManager;
try {
  const BackupManager = require('../../utils/backup-manager');
  backupManager = new BackupManager();
} catch (error) {
  console.error('❌ Failed to load backup manager:', error.message);
  backupManager = null;
}

/**
 * GET /api/system/backup/status
 * Get backup system status and statistics
 */
router.get('/status', verifyAdmin, async (req, res) => {
  try {
    if (!backupManager) {
      return res.status(503).json({
        success: false,
        status: 'unavailable',
        message: 'Backup system not available'
      });
    }
    
    const stats = await backupManager.getBackupStats();
    const backups = await backupManager.listBackups();
    
    res.json({
      success: true,
      status: 'active',
      stats,
      recentBackups: backups.slice(0, 10) // Show 10 most recent
    });
  } catch (error) {
    console.error('Backup status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup status',
      error: error.message
    });
  }
});

/**
 * POST /api/system/backup/create
 * Create a manual backup
 */
router.post('/create', verifyAdmin, async (req, res) => {
  try {
    console.log('📦 Manual backup requested by admin');
    const result = await backupManager.createBackup('manual');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        backup: result.summary,
        path: result.backupPath
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Backup creation failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

/**
 * GET /api/system/backup/list
 * List all available backups
 */
router.get('/list', verifyAdmin, async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    
    res.json({
      success: true,
      backups: backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Backup list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
});

/**
 * POST /api/system/backup/restore
 * Restore from a specific backup
 */
router.post('/restore', verifyAdmin, async (req, res) => {
  try {
    const { backupName } = req.body;
    
    if (!backupName) {
      return res.status(400).json({
        success: false,
        message: 'Backup name is required'
      });
    }
    
    console.log(`🔄 Data restoration requested: ${backupName}`);
    const result = await backupManager.restoreBackup(backupName);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Data restored successfully',
        restoredFiles: result.restoredFiles,
        totalFiles: result.totalFiles
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Restoration failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup restoration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    });
  }
});

/**
 * DELETE /api/system/backup/cleanup
 * Clean up old backups manually
 */
router.delete('/cleanup', verifyAdmin, async (req, res) => {
  try {
    console.log('🗑️  Manual backup cleanup requested');
    await backupManager.cleanupOldBackups();
    
    const stats = await backupManager.getBackupStats();
    
    res.json({
      success: true,
      message: 'Backup cleanup completed',
      remainingBackups: stats.totalBackups
    });
  } catch (error) {
    console.error('Backup cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup backups',
      error: error.message
    });
  }
});

module.exports = router;