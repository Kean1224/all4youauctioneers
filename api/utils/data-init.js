const fs = require('fs');
const path = require('path');

// 🗄️ Production Data Initialization System
class DataInitializer {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.backupDir = path.join(__dirname, '../backups');
  }

  // Initialize all required data files for production
  async initializeDataFiles() {
    console.log('🔄 Initializing production data files...');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('✅ Created data directory');
    }

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Created backup directory');
    }

    const dataFiles = {
      'auctions.json': [],
      'users.json': [],
      'invoices.json': [],
      'auctionDeposits.json': [],
      'contact_inbox.json': [],
      'fica.json': [],
      'item_offers.json': [],
      'lots.json': [],
      'pending-registrations.json': [],
      'pending_items.json': [],
      'pending_users.json': [],
      'refundRequests.json': []
    };

    let initialized = 0;
    let existing = 0;

    for (const [filename, defaultData] of Object.entries(dataFiles)) {
      const filePath = path.join(this.dataDir, filename);
      
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
          initialized++;
          console.log(`✅ Initialized: ${filename}`);
        } catch (error) {
          console.error(`❌ Failed to initialize ${filename}:`, error.message);
        }
      } else {
        existing++;
        console.log(`ℹ️  Already exists: ${filename}`);
      }
    }

    console.log(`📊 Data initialization complete: ${initialized} created, ${existing} existing`);
    return { initialized, existing };
  }

  // Create backup of current data
  async createBackup(suffix = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSuffix = suffix || timestamp;
    
    try {
      const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
      let backed = 0;
      
      for (const file of files) {
        const sourcePath = path.join(this.dataDir, file);
        const backupName = `${file.replace('.json', '')}-backup-${backupSuffix}.json`;
        const backupPath = path.join(this.backupDir, backupName);
        
        fs.copyFileSync(sourcePath, backupPath);
        backed++;
      }
      
      console.log(`💾 Created backup: ${backed} files backed up with suffix ${backupSuffix}`);
      return backupSuffix;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  // Validate data integrity
  async validateDataIntegrity() {
    console.log('🔍 Validating data integrity...');
    const issues = [];
    
    const requiredFiles = [
      'auctions.json',
      'users.json', 
      'invoices.json',
      'auctionDeposits.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.dataDir, file);
      
      try {
        if (!fs.existsSync(filePath)) {
          issues.push(`Missing critical file: ${file}`);
          continue;
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (!Array.isArray(data)) {
          issues.push(`${file} should contain an array`);
        }

        // File-specific validations
        if (file === 'users.json' && data.length === 0) {
          console.log('⚠️  Warning: No users in database');
        }

      } catch (error) {
        issues.push(`${file} is corrupted: ${error.message}`);
      }
    }

    if (issues.length > 0) {
      console.error('❌ Data integrity issues found:');
      issues.forEach(issue => console.error(`   - ${issue}`));
      return false;
    }

    console.log('✅ Data integrity check passed');
    return true;
  }

  // Get system statistics
  getSystemStats() {
    try {
      const stats = {};
      const files = ['users.json', 'auctions.json', 'invoices.json', 'auctionDeposits.json'];
      
      files.forEach(file => {
        const filePath = path.join(this.dataDir, file);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          stats[file.replace('.json', '')] = {
            count: Array.isArray(data) ? data.length : 'N/A',
            lastModified: fs.statSync(filePath).mtime
          };
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {};
    }
  }

  // Clean up old backups (keep last 10)
  async cleanupOldBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) return;
      
      const backupFiles = fs.readdirSync(this.backupDir)
        .filter(f => f.includes('-backup-'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          mtime: fs.statSync(path.join(this.backupDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Keep only the 10 most recent backups
      const toDelete = backupFiles.slice(10);
      
      for (const backup of toDelete) {
        fs.unlinkSync(backup.path);
        console.log(`🗑️  Removed old backup: ${backup.name}`);
      }
      
      if (toDelete.length > 0) {
        console.log(`📁 Cleanup complete: ${toDelete.length} old backups removed`);
      }
    } catch (error) {
      console.error('Error during backup cleanup:', error);
    }
  }
}

// Initialize on startup if running directly
if (require.main === module) {
  const initializer = new DataInitializer();
  initializer.initializeDataFiles()
    .then(() => initializer.validateDataIntegrity())
    .then(() => initializer.cleanupOldBackups())
    .then(() => {
      console.log('📋 System Statistics:', initializer.getSystemStats());
      console.log('🎉 Data initialization complete!');
    })
    .catch(error => {
      console.error('❌ Data initialization failed:', error);
      process.exit(1);
    });
}

module.exports = DataInitializer;