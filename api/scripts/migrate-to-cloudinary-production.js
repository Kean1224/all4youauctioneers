require('dotenv').config();
const dbManager = require('../database/connection');
const cloudinaryService = require('../services/cloudinaryService');

/**
 * Production Cloudinary Migration Script
 * 
 * Migrates base64 files to Cloudinary with proper error handling and retry logic.
 * Safe to run multiple times - skips already migrated files.
 */

class ProductionCloudinaryMigration {
  constructor() {
    this.stats = {
      ficaDocuments: { total: 0, migrated: 0, skipped: 0, failed: 0 },
      lotImages: { total: 0, migrated: 0, skipped: 0, failed: 0 },
      errors: []
    };
  }

  async run() {
    console.log('🚀 Starting Production Cloudinary Migration...\n');
    
    try {
      await dbManager.initialize();
      console.log('✅ Database connected');

      // Test Cloudinary connection with retry
      console.log('🔗 Testing Cloudinary connection...');
      const isHealthy = await this.testCloudinaryWithRetry();
      if (!isHealthy) {
        console.log('❌ Cloudinary not accessible - migration cannot proceed');
        console.log('💡 This is normal in local development due to network restrictions');
        console.log('🚀 Deploy to production (Render/Heroku) to run migration');
        return;
      }
      console.log('✅ Cloudinary connection successful\n');

      // Run migrations
      await this.migrateFicaDocuments();
      await this.migrateLotImages();

      this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration error:', error.message);
      this.stats.errors.push(error.message);
    }
    
    console.log('\n🎉 Migration complete!');
  }

  async testCloudinaryWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const isHealthy = await Promise.race([
          cloudinaryService.healthCheck(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        return isHealthy;
      } catch (error) {
        console.log(`🔄 Connection attempt ${i + 1}/${maxRetries} failed`);
        if (i === maxRetries - 1) return false;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return false;
  }

  async migrateFicaDocuments() {
    console.log('📄 Migrating FICA Documents...');
    
    try {
      // Get FICA documents with base64 URLs
      const result = await dbManager.query(
        'SELECT id, user_email, file_url, original_filename FROM fica_documents WHERE file_url LIKE $1',
        ['data:%']
      );

      this.stats.ficaDocuments.total = result.rows.length;
      console.log(`   Found ${result.rows.length} FICA documents to migrate`);

      for (const doc of result.rows) {
        try {
          console.log(`   📤 Uploading: ${doc.original_filename || 'fica_doc_' + doc.id}`);
          
          // Upload to Cloudinary
          const cloudinaryUrl = await cloudinaryService.migrateBase64ToCloudinary(doc.file_url, {
            userEmail: doc.user_email,
            originalname: doc.original_filename || `fica_doc_${doc.id}.pdf`,
            folder: 'fica-documents'
          });

          // Update database with new URL
          await dbManager.query(
            'UPDATE fica_documents SET file_url = $1 WHERE id = $2',
            [cloudinaryUrl, doc.id]
          );

          this.stats.ficaDocuments.migrated++;
          console.log(`   ✅ Migrated: ${doc.original_filename || 'Document ' + doc.id}`);
          
        } catch (error) {
          this.stats.ficaDocuments.failed++;
          this.stats.errors.push(`FICA ${doc.id}: ${error.message}`);
          console.log(`   ❌ Failed: ${doc.original_filename || 'Document ' + doc.id} - ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ FICA migration error: ${error.message}`);
      this.stats.errors.push(`FICA migration: ${error.message}`);
    }
  }

  async migrateLotImages() {
    console.log('\n🖼️  Migrating Lot Images...');
    
    try {
      // Get lots with base64 images
      const result = await dbManager.query(
        'SELECT id, lot_number, title, image_urls FROM lots WHERE image_urls::text LIKE $1',
        ['%data:%']
      );

      this.stats.lotImages.total = result.rows.length;
      console.log(`   Found ${result.rows.length} lots with base64 images to migrate`);

      for (const lot of result.rows) {
        try {
          const images = Array.isArray(lot.image_urls) ? lot.image_urls : JSON.parse(lot.image_urls || '[]');
          const newImageUrls = [];
          
          for (let i = 0; i < images.length; i++) {
            const imageUrl = images[i];
            
            if (imageUrl && imageUrl.startsWith('data:')) {
              console.log(`   📤 Uploading: Lot ${lot.lot_number} - Image ${i + 1}`);
              
              // Upload to Cloudinary
              const cloudinaryUrl = await cloudinaryService.migrateBase64ToCloudinary(imageUrl, {
                originalname: `lot_${lot.lot_number}_image_${i + 1}.jpg`,
                folder: 'lot-images'
              });
              
              newImageUrls.push(cloudinaryUrl);
            } else {
              // Keep existing Cloudinary URLs
              newImageUrls.push(imageUrl);
            }
          }

          // Update database with new URLs
          await dbManager.query(
            'UPDATE lots SET image_urls = $1 WHERE id = $2',
            [JSON.stringify(newImageUrls), lot.id]
          );

          this.stats.lotImages.migrated++;
          console.log(`   ✅ Migrated: Lot ${lot.lot_number} (${lot.title})`);
          
        } catch (error) {
          this.stats.lotImages.failed++;
          this.stats.errors.push(`Lot ${lot.id}: ${error.message}`);
          console.log(`   ❌ Failed: Lot ${lot.lot_number} - ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Lot images migration error: ${error.message}`);
      this.stats.errors.push(`Lot images migration: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    console.log(`📄 FICA Documents: ${this.stats.ficaDocuments.migrated}/${this.stats.ficaDocuments.total} migrated`);
    console.log(`🖼️  Lot Images: ${this.stats.lotImages.migrated}/${this.stats.lotImages.total} migrated`);
    console.log(`❌ Total Errors: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => console.log(`   - ${error}`));
    }

    const totalMigrated = this.stats.ficaDocuments.migrated + this.stats.lotImages.migrated;
    const totalFailed = this.stats.ficaDocuments.failed + this.stats.lotImages.failed;
    
    console.log('\n🎯 Result:');
    if (totalFailed === 0 && totalMigrated > 0) {
      console.log('✅ Migration completed successfully!');
    } else if (totalMigrated > 0) {
      console.log(`⚠️  Partial success: ${totalMigrated} migrated, ${totalFailed} failed`);
    } else {
      console.log('ℹ️  No files needed migration or migration could not proceed');
    }
  }
}

// Production migration status check
async function checkMigrationStatus() {
  try {
    await dbManager.initialize();
    
    const ficaCount = await dbManager.query('SELECT COUNT(*) as count FROM fica_documents WHERE file_url LIKE $1', ['data:%']);
    const lotsCount = await dbManager.query('SELECT COUNT(*) as count FROM lots WHERE image_urls::text LIKE $1', ['%data:%']);
    
    console.log('📊 Migration Status Check:');
    console.log(`📄 FICA documents needing migration: ${ficaCount.rows[0].count}`);
    console.log(`🖼️  Lots needing migration: ${lotsCount.rows[0].count}`);
    
    if (ficaCount.rows[0].count === '0' && lotsCount.rows[0].count === '0') {
      console.log('✅ All files already migrated to Cloudinary!');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    return false;
  }
}

// Run migration
async function runMigration() {
  const alreadyMigrated = await checkMigrationStatus();
  if (alreadyMigrated) {
    process.exit(0);
  }
  
  const migration = new ProductionCloudinaryMigration();
  await migration.run();
}

// Run if called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionCloudinaryMigration;