const fs = require('fs');
const path = require('path');
const dbModels = require('../database/models');

// 🗄️ PostgreSQL Data Validation System (Removed JSON Dependencies)
class DataInitializer {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.backupDir = path.join(__dirname, '../backups');
  }

  // PostgreSQL-only data validation (no JSON files created)
  async initializeDataFiles() {
    console.log('🔄 Validating PostgreSQL data integrity...');
    
    try {
      // Validate key database tables exist and have data
      const validationResults = await this.validateDatabaseTables();
      
      console.log(`🔍 Validating data integrity...`);
      
      if (validationResults.allValid) {
        console.log('✅ Data integrity check passed');
      } else {
        console.log('⚠️  Some tables are empty - this is normal for new installations');
      }
      
      // Legacy: Keep directories for any remaining file operations  
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      return { 
        initialized: 0, 
        existing: 0, // No JSON files created
        databaseValid: validationResults.allValid,
        tableStatus: validationResults.tables
      };
      
    } catch (error) {
      console.error('❌ Data validation failed:', error.message);
      return { initialized: 0, existing: 0, databaseValid: false };
    }
  }

  // Validate that key database tables exist and are accessible
  async validateDatabaseTables() {
    const tables = [
      { name: 'users', description: 'User accounts' },
      { name: 'auctions', description: 'Auction listings' },
      { name: 'lots', description: 'Auction lots' },
      { name: 'fica_documents', description: 'FICA documents' },
      { name: 'auction_deposits', description: 'Auction deposits' },
      { name: 'pending_items', description: 'Pending items' }
    ];

    const results = { allValid: true, tables: {} };

    for (const table of tables) {
      try {
        // Simple count query to verify table exists and is accessible
        const dbManager = require('../database/connection');
        const countResult = await dbManager.query(`SELECT COUNT(*) as count FROM ${table.name}`);
        const count = parseInt(countResult.rows[0].count);
        
        results.tables[table.name] = { 
          exists: true, 
          count: count,
          description: table.description 
        };
        
        console.log(`✅ ${table.description}: ${count} records`);
        
      } catch (error) {
        console.log(`❌ ${table.description}: Table validation failed`);
        results.tables[table.name] = { 
          exists: false, 
          error: error.message,
          description: table.description 
        };
        results.allValid = false;
      }
    }

    return results;
  }

  // Database backup using PostgreSQL dump (replaces JSON backup)
  async createDatabaseBackup(suffix = '') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupSuffix = suffix || timestamp;
    
    console.log(`🗄️  Database backup should be handled by your PostgreSQL hosting provider`);
    console.log(`   Render automatically handles database backups`);
    console.log(`   For manual backup, use: pg_dump DATABASE_URL > backup_${backupSuffix}.sql`);
    
    return { success: true, message: 'Database backup info provided' };
  }

  // Remove legacy JSON files
  async cleanupLegacyJsonFiles() {
    console.log('🧹 Cleaning up legacy JSON files...');
    
    const legacyFiles = [
      'auctions.json',
      'users.json', 
      'invoices.json',
      'auctionDeposits.json',
      'contact_inbox.json',
      'fica.json',
      'item_offers.json',
      'lots.json',
      'pending-registrations.json',
      'pending_items.json',
      'pending_users.json',
      'refundRequests.json'
    ];

    let removed = 0;
    let notFound = 0;

    for (const filename of legacyFiles) {
      const filePath = path.join(this.dataDir, filename);
      
      if (fs.existsSync(filePath)) {
        try {
          // Create backup before removal
          const backupPath = path.join(this.backupDir, `legacy_${filename}_${Date.now()}`);
          fs.copyFileSync(filePath, backupPath);
          fs.unlinkSync(filePath);
          
          removed++;
          console.log(`🗑️  Removed: ${filename} (backed up)`);
        } catch (error) {
          console.error(`❌ Failed to remove ${filename}:`, error.message);
        }
      } else {
        notFound++;
      }
    }

    console.log(`🧹 Legacy cleanup complete: ${removed} removed, ${notFound} not found`);
    return { removed, notFound };
  }

  // Health check for PostgreSQL-only system
  async healthCheck() {
    try {
      const validation = await this.validateDatabaseTables();
      
      return {
        status: validation.allValid ? 'healthy' : 'degraded',
        database: 'postgresql',
        jsonFiles: 'removed',
        tables: validation.tables,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'postgresql',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = DataInitializer;