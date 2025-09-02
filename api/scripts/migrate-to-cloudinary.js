require('dotenv').config();
const dbManager = require('../database/connection');
const cloudinaryService = require('../services/cloudinaryService');

/**
 * Migration Script: Base64 Database Storage → Cloudinary
 * 
 * This script migrates all base64-encoded files from the database to Cloudinary
 * and updates the database records with the new Cloudinary URLs.
 */

class CloudinaryMigration {
  constructor() {
    this.stats = {
      ficaDocuments: { processed: 0, success: 0, failed: 0 },
      lotImages: { processed: 0, success: 0, failed: 0 },
      pendingImages: { processed: 0, success: 0, failed: 0 },
      depositProofs: { processed: 0, success: 0, failed: 0 }
    };
  }

  async run() {
    console.log('🚀 Starting Cloudinary migration...\n');
    
    try {
      await dbManager.initialize();
      console.log('✅ Database connected\n');

      // Health check Cloudinary
      const isHealthy = await cloudinaryService.healthCheck();
      if (!isHealthy) {
        throw new Error('Cloudinary service is not available');
      }
      console.log('✅ Cloudinary service is healthy\n');

      // Run migrations in sequence
      await this.migrateFicaDocuments();
      await this.migrateLotImages();
      await this.migratePendingImages();
      await this.migrateDepositProofs();

      this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      console.log('\n🔌 Closing database connection...');
      await dbManager.close();
    }
  }

  async migrateFicaDocuments() {
    console.log('📋 Migrating FICA documents...');
    
    try {
      const query = `
        SELECT id, user_email, file_url, original_filename, file_size, mime_type
        FROM fica_documents 
        WHERE file_url LIKE 'data:%'
        ORDER BY id
      `;
      
      const result = await dbManager.query(query);
      const documents = result.rows;
      
      console.log(`Found ${documents.length} FICA documents to migrate`);
      
      for (const doc of documents) {
        this.stats.ficaDocuments.processed++;
        
        try {
          console.log(`  Processing FICA doc ID ${doc.id} for user ${doc.user_email}`);
          
          const cloudinaryUrl = await cloudinaryService.migrateBase64ToCloudinary(
            doc.file_url,
            {
              folder: 'fica',
              userEmail: doc.user_email,
              originalname: doc.original_filename
            }
          );
          
          // Update database with new URL
          await dbManager.query(
            'UPDATE fica_documents SET file_url = $1, migrated_at = NOW() WHERE id = $2',
            [cloudinaryUrl, doc.id]
          );
          
          this.stats.ficaDocuments.success++;
          console.log(`    ✅ Migrated: ${cloudinaryUrl}`);
          
        } catch (error) {
          this.stats.ficaDocuments.failed++;
          console.error(`    ❌ Failed to migrate FICA doc ID ${doc.id}:`, error.message);
        }
      }
      
      console.log(`📋 FICA migration complete: ${this.stats.ficaDocuments.success}/${documents.length} successful\n`);
      
    } catch (error) {
      console.error('❌ FICA documents migration error:', error);
    }
  }

  async migrateLotImages() {
    console.log('🖼️  Migrating lot images...');
    
    try {
      const query = `
        SELECT id, auction_id, title, image_data
        FROM lots 
        WHERE image_data IS NOT NULL 
        AND image_data LIKE 'data:%'
        ORDER BY id
      `;
      
      const result = await dbManager.query(query);
      const lots = result.rows;
      
      console.log(`Found ${lots.length} lot images to migrate`);
      
      for (const lot of lots) {
        this.stats.lotImages.processed++;
        
        try {
          console.log(`  Processing lot ID ${lot.id}: ${lot.title}`);
          
          const cloudinaryUrl = await cloudinaryService.migrateBase64ToCloudinary(
            lot.image_data,
            {
              folder: 'lots',
              userEmail: `auction_${lot.auction_id}`,
              originalname: `${lot.title.replace(/[^a-zA-Z0-9]/g, '_')}_image`
            }
          );
          
          // Update database with new URL
          await dbManager.query(
            'UPDATE lots SET image_data = $1, migrated_at = NOW() WHERE id = $2',
            [cloudinaryUrl, lot.id]
          );
          
          this.stats.lotImages.success++;
          console.log(`    ✅ Migrated: ${cloudinaryUrl}`);
          
        } catch (error) {
          this.stats.lotImages.failed++;
          console.error(`    ❌ Failed to migrate lot ID ${lot.id}:`, error.message);
        }
      }
      
      console.log(`🖼️  Lot images migration complete: ${this.stats.lotImages.success}/${lots.length} successful\n`);
      
    } catch (error) {
      console.error('❌ Lot images migration error:', error);
    }
  }

  async migratePendingImages() {
    console.log('⏳ Migrating pending item images...');
    
    try {
      const query = `
        SELECT id, name, user_email, image_data
        FROM pending_items 
        WHERE image_data IS NOT NULL 
        AND image_data LIKE 'data:%'
        ORDER BY id
      `;
      
      const result = await dbManager.query(query);
      const items = result.rows;
      
      console.log(`Found ${items.length} pending item images to migrate`);
      
      for (const item of items) {
        this.stats.pendingImages.processed++;
        
        try {
          console.log(`  Processing pending item ID ${item.id}: ${item.name}`);
          
          const cloudinaryUrl = await cloudinaryService.migrateBase64ToCloudinary(
            item.image_data,
            {
              folder: 'pending',
              userEmail: item.user_email,
              originalname: `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}_image`
            }
          );
          
          // Update database with new URL
          await dbManager.query(
            'UPDATE pending_items SET image_data = $1, migrated_at = NOW() WHERE id = $2',
            [cloudinaryUrl, item.id]
          );
          
          this.stats.pendingImages.success++;
          console.log(`    ✅ Migrated: ${cloudinaryUrl}`);
          
        } catch (error) {
          this.stats.pendingImages.failed++;
          console.error(`    ❌ Failed to migrate pending item ID ${item.id}:`, error.message);
        }
      }
      
      console.log(`⏳ Pending images migration complete: ${this.stats.pendingImages.success}/${items.length} successful\n`);
      
    } catch (error) {
      console.error('❌ Pending images migration error:', error);
    }
  }

  async migrateDepositProofs() {
    console.log('💰 Migrating deposit proof files...');
    
    try {
      const query = `
        SELECT id, user_email, proof_file_data, proof_filename
        FROM auction_deposits 
        WHERE proof_file_data IS NOT NULL 
        AND proof_file_data LIKE 'data:%'
        ORDER BY id
      `;
      
      const result = await dbManager.query(query);
      const deposits = result.rows;
      
      console.log(`Found ${deposits.length} deposit proof files to migrate`);
      
      for (const deposit of deposits) {
        this.stats.depositProofs.processed++;
        
        try {
          console.log(`  Processing deposit ID ${deposit.id} for user ${deposit.user_email}`);
          
          const cloudinaryUrl = await cloudinaryService.migrateBase64ToCloudinary(
            deposit.proof_file_data,
            {
              folder: 'deposits',
              userEmail: deposit.user_email,
              originalname: deposit.proof_filename || 'deposit_proof'
            }
          );
          
          // Update database with new URL
          await dbManager.query(
            'UPDATE auction_deposits SET proof_file_data = $1, migrated_at = NOW() WHERE id = $2',
            [cloudinaryUrl, deposit.id]
          );
          
          this.stats.depositProofs.success++;
          console.log(`    ✅ Migrated: ${cloudinaryUrl}`);
          
        } catch (error) {
          this.stats.depositProofs.failed++;
          console.error(`    ❌ Failed to migrate deposit ID ${deposit.id}:`, error.message);
        }
      }
      
      console.log(`💰 Deposit proofs migration complete: ${this.stats.depositProofs.success}/${deposits.length} successful\n`);
      
    } catch (error) {
      console.error('❌ Deposit proofs migration error:', error);
    }
  }

  printSummary() {
    console.log('📊 Migration Summary:');
    console.log('================================');
    
    const categories = [
      { name: 'FICA Documents', key: 'ficaDocuments' },
      { name: 'Lot Images', key: 'lotImages' },
      { name: 'Pending Images', key: 'pendingImages' },
      { name: 'Deposit Proofs', key: 'depositProofs' }
    ];
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    
    categories.forEach(category => {
      const stats = this.stats[category.key];
      totalProcessed += stats.processed;
      totalSuccess += stats.success;
      totalFailed += stats.failed;
      
      console.log(`${category.name}: ${stats.success}/${stats.processed} (${stats.failed} failed)`);
    });
    
    console.log('================================');
    console.log(`Total: ${totalSuccess}/${totalProcessed} (${totalFailed} failed)`);
    
    if (totalFailed === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log(`⚠️  Migration completed with ${totalFailed} failures. Check logs above for details.`);
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new CloudinaryMigration();
  migration.run().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = CloudinaryMigration;