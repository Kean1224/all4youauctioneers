const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Automatic Data Backup Manager
 * Implements secure, automated backups for critical data
 */
class BackupManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.maxBackups = 30; // Keep 30 days of backups
    
    // Critical files that must be backed up
    this.criticalFiles = [
      'users.json',
      'auctions.json', 
      'lots.json',
      'invoices.json',
      'auctionDeposits.json',
      'fica.json',
      'refundRequests.json'
    ];
  }

  /**
   * Initialize backup system - create directories and start schedules
   */
  async initialize() {
    try {
      await this.ensureBackupDir();
      console.log('📦 Backup system initialized successfully');
      
      // Start automatic backup scheduler
      this.startBackupSchedule();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize backup system:', error);
      return false;
    }
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('📁 Created backup directory:', this.backupDir);
    }
  }

  /**
   * Create a complete backup of all critical data
   */
  async createBackup(type = 'automatic') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `backup-${type}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });
      
      const backupSummary = {
        timestamp: new Date().toISOString(),
        type: type,
        files: [],
        status: 'success'
      };

      // Backup critical data files
      for (const file of this.criticalFiles) {
        const sourcePath = path.join(this.dataDir, file);
        const destPath = path.join(backupPath, file);
        
        try {
          // Check if source file exists
          await fs.access(sourcePath);
          
          // Copy file with metadata preservation
          await fs.copyFile(sourcePath, destPath);
          
          // Get file stats for backup summary
          const stats = await fs.stat(sourcePath);
          backupSummary.files.push({
            filename: file,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
          
          console.log(`✅ Backed up: ${file}`);
        } catch (error) {
          console.warn(`⚠️  Warning: Could not backup ${file}:`, error.message);
        }
      }

      // Create backup manifest
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(backupSummary, null, 2));
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      console.log(`✅ Backup completed: ${backupName}`);
      console.log(`📊 Backed up ${backupSummary.files.length} files`);
      
      return { success: true, backupPath, summary: backupSummary };
      
    } catch (error) {
      console.error(`❌ Backup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore data from a specific backup
   */
  async restoreBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    
    try {
      // Check if backup exists
      await fs.access(backupPath);
      
      // Read backup manifest
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      console.log(`🔄 Restoring backup: ${backupName} (${manifest.timestamp})`);
      
      // Create restoration timestamp for current data
      const restoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const preRestoreBackup = `pre-restore-${restoreTimestamp}`;
      
      // Create backup of current data before restoration
      console.log('📦 Creating pre-restoration backup...');
      await this.createBackup('pre-restore');
      
      // Restore each file
      let restoredCount = 0;
      for (const fileInfo of manifest.files) {
        const sourcePath = path.join(backupPath, fileInfo.filename);
        const destPath = path.join(this.dataDir, fileInfo.filename);
        
        try {
          await fs.copyFile(sourcePath, destPath);
          restoredCount++;
          console.log(`✅ Restored: ${fileInfo.filename}`);
        } catch (error) {
          console.error(`❌ Failed to restore ${fileInfo.filename}:`, error.message);
        }
      }
      
      console.log(`✅ Restoration completed: ${restoredCount}/${manifest.files.length} files`);
      return { success: true, restoredFiles: restoredCount, totalFiles: manifest.files.length };
      
    } catch (error) {
      console.error(`❌ Restoration failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      const backupDirs = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const dir of backupDirs) {
        if (dir.startsWith('backup-')) {
          const manifestPath = path.join(this.backupDir, dir, 'backup-manifest.json');
          
          try {
            const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
            const stats = await fs.stat(path.join(this.backupDir, dir));
            
            backups.push({
              name: dir,
              timestamp: manifest.timestamp,
              type: manifest.type,
              fileCount: manifest.files.length,
              size: stats.size,
              created: stats.birthtime.toISOString()
            });
          } catch (error) {
            console.warn(`⚠️  Warning: Could not read backup manifest for ${dir}`);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      return [];
    }
  }

  /**
   * Clean up old backups (keep only the most recent ones)
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
          const backupPath = path.join(this.backupDir, backup.name);
          await fs.rmdir(backupPath, { recursive: true });
          console.log(`🗑️  Cleaned up old backup: ${backup.name}`);
        }
        
        console.log(`✅ Cleanup completed: removed ${backupsToDelete.length} old backups`);
      }
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error.message);
    }
  }

  /**
   * Start automatic backup schedule (every 6 hours)
   */
  startBackupSchedule() {
    // Create immediate backup on startup
    setTimeout(() => {
      this.createBackup('startup');
    }, 5000); // Wait 5 seconds after startup
    
    // Schedule regular backups every 6 hours
    const sixHours = 6 * 60 * 60 * 1000;
    setInterval(() => {
      this.createBackup('scheduled');
    }, sixHours);
    
    console.log('⏰ Automatic backup scheduler started (every 6 hours)');
  }

  /**
   * Get backup statistics
   */
  async getBackupStats() {
    try {
      const backups = await this.listBackups();
      
      let totalSize = 0;
      let totalFiles = 0;
      const typeStats = {};
      
      for (const backup of backups) {
        totalSize += backup.size;
        totalFiles += backup.fileCount;
        
        if (!typeStats[backup.type]) {
          typeStats[backup.type] = 0;
        }
        typeStats[backup.type]++;
      }
      
      return {
        totalBackups: backups.length,
        totalSize: totalSize,
        totalFiles: totalFiles,
        oldestBackup: backups[backups.length - 1]?.timestamp,
        newestBackup: backups[0]?.timestamp,
        typeBreakdown: typeStats
      };
    } catch (error) {
      console.error('❌ Failed to get backup stats:', error.message);
      return null;
    }
  }
}

module.exports = BackupManager;