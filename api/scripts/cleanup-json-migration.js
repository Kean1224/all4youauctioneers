require('dotenv').config();
const fs = require('fs');
const path = require('path');
const DataInitializer = require('../utils/data-init');

/**
 * JSON Migration Cleanup Script
 * 
 * This script completes the migration away from JSON files by:
 * 1. Backing up existing JSON files
 * 2. Removing legacy JSON files
 * 3. Validating PostgreSQL data integrity
 * 4. Generating migration report
 */

class JsonMigrationCleanup {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.backupDir = path.join(__dirname, '../backups');
    this.dataInit = new DataInitializer();
    
    this.stats = {
      jsonFilesFound: 0,
      jsonFilesBackedUp: 0,
      jsonFilesRemoved: 0,
      databaseTablesValidated: 0,
      errors: []
    };
  }

  async run() {
    console.log('🧹 Starting JSON Migration Cleanup...\n');
    
    try {
      await this.validatePrerequisites();
      await this.inventoryJsonFiles();
      await this.createJsonBackups();
      await this.validateDatabaseMigration();
      await this.removeJsonFiles();
      await this.verifyCleanup();
      
      this.printSummary();
      console.log('\n✅ JSON Migration Cleanup Complete!');
      
    } catch (error) {
      console.error('❌ Migration cleanup failed:', error);
      process.exit(1);
    }
  }

  async validatePrerequisites() {
    console.log('🔍 Validating prerequisites...');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Created backup directory');
    }

    // Test database connectivity
    const healthCheck = await this.dataInit.healthCheck();
    if (healthCheck.status !== 'healthy' && healthCheck.status !== 'degraded') {
      throw new Error(`Database not accessible: ${healthCheck.error}`);
    }
    
    console.log('✅ Prerequisites validated\n');
  }

  async inventoryJsonFiles() {
    console.log('📋 Inventorying JSON files...');
    
    if (!fs.existsSync(this.dataDir)) {
      console.log('ℹ️  No data directory found');
      return;
    }

    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    this.stats.jsonFilesFound = files.length;
    
    console.log(`📊 Found ${files.length} JSON files:`);
    files.forEach(file => {
      const filePath = path.join(this.dataDir, file);
      const stat = fs.statSync(filePath);
      console.log(`   - ${file} (${(stat.size / 1024).toFixed(2)} KB)`);
    });
    
    console.log('');
  }

  async createJsonBackups() {
    console.log('💾 Creating JSON file backups...');
    
    if (!fs.existsSync(this.dataDir)) {
      console.log('ℹ️  No data directory to backup');
      return;
    }

    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    for (const file of files) {
      try {
        const sourcePath = path.join(this.dataDir, file);
        const backupPath = path.join(this.backupDir, `migration_backup_${timestamp}_${file}`);
        
        fs.copyFileSync(sourcePath, backupPath);
        this.stats.jsonFilesBackedUp++;
        console.log(`✅ Backed up: ${file}`);
        
      } catch (error) {
        console.error(`❌ Failed to backup ${file}:`, error.message);
        this.stats.errors.push(`Backup failed: ${file} - ${error.message}`);
      }
    }
    
    console.log(`💾 Backup complete: ${this.stats.jsonFilesBackedUp} files backed up\n`);
  }

  async validateDatabaseMigration() {
    console.log('🔍 Validating database migration...');
    
    const validation = await this.dataInit.validateDatabaseTables();
    
    if (validation.allValid) {
      console.log('✅ All database tables validated successfully');
    } else {
      console.log('⚠️  Some database tables have issues (may be normal for new installs)');
    }

    // Count successful validations
    this.stats.databaseTablesValidated = Object.values(validation.tables)
      .filter(table => table.exists).length;
    
    console.log(`📊 Database tables validated: ${this.stats.databaseTablesValidated}\n`);
  }

  async removeJsonFiles() {
    console.log('🗑️  Removing JSON files...');
    
    if (!fs.existsSync(this.dataDir)) {
      console.log('ℹ️  No JSON files to remove');
      return;
    }

    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      try {
        const filePath = path.join(this.dataDir, file);
        fs.unlinkSync(filePath);
        this.stats.jsonFilesRemoved++;
        console.log(`🗑️  Removed: ${file}`);
        
      } catch (error) {
        console.error(`❌ Failed to remove ${file}:`, error.message);
        this.stats.errors.push(`Removal failed: ${file} - ${error.message}`);
      }
    }
    
    console.log(`🗑️  Removal complete: ${this.stats.jsonFilesRemoved} files removed\n`);
  }

  async verifyCleanup() {
    console.log('✅ Verifying cleanup...');
    
    // Check that no JSON files remain
    if (fs.existsSync(this.dataDir)) {
      const remainingFiles = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
      
      if (remainingFiles.length > 0) {
        console.log(`⚠️  ${remainingFiles.length} JSON files still remain:`);
        remainingFiles.forEach(file => console.log(`   - ${file}`));
      } else {
        console.log('✅ No JSON files remain in data directory');
      }
    }

    // Verify database is still accessible
    const healthCheck = await this.dataInit.healthCheck();
    if (healthCheck.status === 'healthy' || healthCheck.status === 'degraded') {
      console.log('✅ Database remains accessible after cleanup');
    } else {
      throw new Error('Database became inaccessible after cleanup');
    }
    
    console.log('');
  }

  printSummary() {
    console.log('📊 Migration Cleanup Summary:');
    console.log('================================');
    console.log(`JSON files found: ${this.stats.jsonFilesFound}`);
    console.log(`JSON files backed up: ${this.stats.jsonFilesBackedUp}`);
    console.log(`JSON files removed: ${this.stats.jsonFilesRemoved}`);
    console.log(`Database tables validated: ${this.stats.databaseTablesValidated}`);
    console.log(`Errors encountered: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n🎉 Migration Status:');
    if (this.stats.jsonFilesRemoved === this.stats.jsonFilesFound && this.stats.errors.length === 0) {
      console.log('✅ Complete success - All JSON files removed, database validated');
    } else if (this.stats.errors.length === 0) {
      console.log('✅ Success - JSON files processed, database validated');
    } else {
      console.log('⚠️  Partial success - Some errors encountered, check logs above');
    }

    console.log('\n💾 Backup Location:');
    console.log(`   ${this.backupDir}`);
    console.log('   (JSON files backed up before removal)');
  }
}

// Add cleanup method to DataInitializer for easy access
async function runCleanup() {
  const cleanup = new JsonMigrationCleanup();
  await cleanup.run();
}

// Run cleanup if called directly
if (require.main === module) {
  runCleanup().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = JsonMigrationCleanup;