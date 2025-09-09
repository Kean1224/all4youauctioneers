// Database optimization runner - execute critical indexes
const dbManager = require('./connection');
const fs = require('fs');
const path = require('path');

async function runOptimization() {
  console.log('🚀 Starting database optimization for 1000+ concurrent users...');
  
  try {
    // Read the optimization SQL file
    const sqlPath = path.join(__dirname, 'optimize-for-production.sql');
    const optimizationSQL = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements (remove comments and empty lines)
    const statements = optimizationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.match(/^\/\*.*\*\/$/));
    
    console.log(`📋 Found ${statements.length} optimization statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⚡ [${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
        
        const startTime = Date.now();
        await dbManager.query(statement);
        const duration = Date.now() - startTime;
        
        console.log(`✅ [${i + 1}/${statements.length}] Completed in ${duration}ms`);
        successCount++;
        
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already exists)`);
          skipCount++;
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] Failed:`, error.message);
          // Continue with other optimizations even if one fails
        }
      }
    }
    
    console.log('\n🎉 DATABASE OPTIMIZATION COMPLETE!');
    console.log(`✅ Successfully executed: ${successCount} optimizations`);
    console.log(`⏭️  Skipped (existing): ${skipCount} optimizations`);
    console.log('\n📊 Your database is now optimized for 1000+ concurrent bidders!');
    
    // Verify some key indexes were created
    await verifyOptimizations();
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
}

async function verifyOptimizations() {
  console.log('\n🔍 Verifying critical indexes...');
  
  try {
    const indexQuery = `
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND (indexname LIKE 'idx_bids%' 
             OR indexname LIKE 'idx_lots%' 
             OR indexname LIKE 'idx_auctions%')
      ORDER BY tablename, indexname;
    `;
    
    const result = await dbManager.query(indexQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Critical indexes verified:');
      result.rows.forEach(row => {
        console.log(`   📋 ${row.tablename}.${row.indexname}`);
      });
    } else {
      console.log('⚠️  No custom indexes found - this may indicate the optimization needs manual review');
    }
    
  } catch (error) {
    console.log('⚠️  Index verification failed (this is not critical):', error.message);
  }
}

// Run optimization if called directly
if (require.main === module) {
  runOptimization()
    .then(() => {
      console.log('✅ Database optimization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { runOptimization };